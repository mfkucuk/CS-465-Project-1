
var gl;
var points;

const SQUARE_SIZE = 20;

window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas" );
    var startDrawing = false;
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    canvas.onmousedown = function (e) 
    {
        startDrawing = true;
        draw(e.x, e.y);
    }

    canvas.onmouseup = function (e)
    {
        startDrawing = false;
    }


    canvas.onmousemove = function (e) 
    {
        if (startDrawing) 
        {
            draw(e.x, e.y);
        }
    }

    canvas.onmouseleave = function (e) 
    {
        startDrawing = false;
    }

    var vertices = [
        vec2(-1, -1),
        vec2(0, 1),
        vec2(1, -1)
    ];

    //  Configure WebGL

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    
    //  Load shaders and initialize attribute buffers
    
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    // Load the data into the GPU
    
    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );

    // Associate out shader variables with our data buffer
    
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
};


function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.TRIANGLES, 0, 3 );
}

function draw(x, y) 
{
    var row = y / SQUARE_SIZE;
    var col = x / SQUARE_SIZE;

    console.log(`Row: ${parseInt(row)}`);
    console.log(`Col: ${parseInt(col)}`);
}
