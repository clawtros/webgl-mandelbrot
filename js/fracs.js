var GLUtils = {
  // GL -> ProgramType -> DOM ID -> Shader
  compileShader: function(gl, programType, domId, templateVars) {
    var shaderScript = document.getElementById(domId),
        shaderSource = shaderScript.text,
        shader = gl.createShader(programType);
    for (var v in templateVars) {
      console.log("[[" + v + "]]", templateVars[v]);
      shaderSource = shaderSource.replace("[[" + v + "]]", templateVars[v]);
    }
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success) {
      throw "could not compile shader:" + gl.getShaderInfoLog(shader);
    }
    return shader
  },
  // GL -> Shader -> Shader -> Program
  makeProgram: function(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    return program;
  },
  // GL -> Program -> Void
  linkProgram: function(gl, program) {
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
      throw ("program failed to link:" + gl.getProgramInfoLog (program));
    }
    gl.useProgram(program);
  }
}


function Fracs() {}

Fracs.prototype = {

  recompile(options) {
    document.getElementById('it-report').innerHTML = options.iterations;
        this.fragS = GLUtils.compileShader(this.gl, this.gl.FRAGMENT_SHADER, '2d-fragment-shader'
        ,
        {
          ITERATIONS: options.iterations
        });
        this.vertS = GLUtils.compileShader(
          this.gl,
          this.gl.VERTEX_SHADER,
          '2d-vertex-shader'
        );

        this.program = GLUtils.makeProgram(this.gl, this.vertS, this.fragS);
        GLUtils.linkProgram(this.gl, this.program);
        var positionLocation = this.gl.getAttribLocation(this.program, "a_position");
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        this.u_steps_loc = this.gl.getUniformLocation(this.program, "steps");
        this.u_center_loc = this.gl.getUniformLocation(this.program, "center");
        this.u_scale_loc = this.gl.getUniformLocation(this.program, "user_scale");
        this.u_resolution_loc = this.gl.getUniformLocation(this.program, "canvas_resolution");

        this.gl.uniform1f(this.u_resolution_loc, this.RESOLUTION);
        this.gl.uniform1i(this.u_steps_loc, 0);

        this.gl.uniform1f(this.u_scale_loc, this.scale);

  },

  init: function(options) {
    var options = options || {};
    this.canvas = document.getElementById(options.canvasId || 'c');
    this.RESOLUTION = options.resolution || 2048;
    this.canvas.width = this.RESOLUTION;
    this.canvas.height = this.RESOLUTION;
    this.steps = 0;
    this.center = new Float32Array(options.center || [-0.1617813722206478, -1.0368353669490136]);
    this.gl = this.canvas.getContext('experimental-webgl');
    this.buffer = this.gl.createBuffer();

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1.0, -1.0,
                        1.0, -1.0,
                       -1.0,  1.0,
                       -1.0,  1.0,
                        1.0, -1.0,
                        1.0,  1.0]),
      this.gl.STATIC_DRAW
    );

    this.recompile({
      iterations: 256
    })

    this.scale = 10;
    this.current_scale = this.scale;
    this.direction = -1;
    this.target_center = this.center;

    this.render();

    this.canvas.addEventListener('click', function(e) {
      e.preventDefault();
      var r = this.canvas.getBoundingClientRect(),
          px = (e.offsetX) / r.width,
          py = (e.offsetY) / r.height,
          dx = (px - 0.5) * this.current_scale,
          dy = (0.5 - py) * this.current_scale,
          nc = [this.center[0] + dx,
                this.center[1] + dy]
      this.target_center = nc;
    }.bind(this));

    document.getElementById("rangeslider").addEventListener("change", function(e) {
      this.recompile({
        iterations: e.target.value
      })
    }.bind(this))
  },

  render: function() {
    window.requestAnimationFrame(this.render.bind(this));
    var dcx = this.target_center[0] - this.center[0],
        dcy = this.target_center[1] - this.center[1];

    this.current_scale += this.current_scale * 0.005 * this.direction;
    if (this.current_scale < 0.00001 || this.current_scale > 10) {
      this.direction *= -1;
    }
    this.steps += 1;


    if (Math.abs(dcx) > dcx / 10. ||
        Math.abs(dcy) > dcy / 10.) {
       this.center = new Float32Array([
         this.center[0] + dcx / 10.,
         this.center[1] + dcy / 10.
       ]);
    }

    this.gl.uniform2fv(this.u_center_loc, this.center);
    this.gl.uniform1f(this.u_scale_loc, this.current_scale);
    this.gl.uniform1i(this.u_steps_loc, this.steps);

    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }
};
