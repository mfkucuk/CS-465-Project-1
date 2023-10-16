var gl;
var points;

const SQUARE_SIZE = 20;

var canvas;

var bufferId;
var cBufferId;
var rectBufferId;
var program;

var vertices = [];
var colorList = [];
var currentColor = vec4(0.0, 0.0, 0.0, 1.0);

var selectVertices = [];
var triangleVerticesInSelect = [];

var firstLayerIndex = 0;
var secondLayerIndex = 0;
var thirdLayerIndex = 0;

var firstLayer = 10;
var secondLayer = 20;
var thirdLayer = 30;

var layers = [firstLayer, secondLayer, thirdLayer];

var currentLayer = firstLayer;

var firstCorner;

var undoList = [];
var undoColorList = [];
var redoList = [];
var redoColorList = [];

var currentLine = [];

var cameraPos = [0.0, 0.0, 0.0];

var zoomFactor = 1.0;

var prevMousePos = -1;

window.onload = function init()
{
    var rad = document.getElementsByClassName("rads");
    for (var i = 0; i < rad.length; i++) {
        rad[i].addEventListener('change', function() {

            for (var i = 0; i < vertices.length; i++) 
            {
                if (vertices[i][2] % 10 == 1) 
                {
                    vertices[i][2]--;
                }
            }

            eraseEnabled = false;
            selectEnabled = false;
            selectVertices = [];
            triangleVerticesInSelect = [];
            render();
            switch (this.value) 
            {
                case "red":
                    currentColor = vec4(1.0, 0.0, 0.0, 1.0);
                    break;

                case "blue":
                    currentColor = vec4(0.0, 0.0, 1.0, 1.0);
                    break;

                case "green":
                    currentColor = vec4(0.0, 0.5, 0.0, 1.0);
                    break;
                
                case "orange":
                    currentColor = vec4(1.0, 0.471, 0.0, 1.0);
                    break;

                case "yellow":
                    currentColor = vec4(1.0, 1.0, 0.0, 1.0);
                    break;

                case "purple":
                    currentColor = vec4(0.5, 0.0, 0.5, 1.0);
                    break;

                case "pink":
                    currentColor = vec4(0.859, 0.439, 0.576, 1.0);
                    break;

                case "black":
                    currentColor = vec4(0.0, 0.0, 0.0, 1.0);
                    break;

                case "erase":
                    eraseEnabled = true;
                    break;

                case "select":
                    selectEnabled = true;
                    break;

            }
        });
    }

    canvas = document.getElementById( "gl-canvas" );

    var startDrawing = false;
    var startMoving = false;
    var eraseEnabled = false;
    var selectEnabled = false;

    width = canvas.width;
    height = canvas.height;
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    bufferId = gl.createBuffer();
    cBufferId = gl.createBuffer();
    rectBufferId = gl.createBuffer();

    var moveLayerUpButton = document.getElementById("moveLayerUp");
    var moveLayerDownButton = document.getElementById("moveLayerDown");

    var saveButton = document.getElementById("save");
    var loadButton = document.getElementById("load");
    var fileInput = document.getElementById("fileInput");

    var layerSelect = document.getElementById('layerSelect');
    
    moveLayerUpButton.addEventListener('click', () => {
       
        // Function to increase currentLayer and update the array
        const currentIndex = layers.indexOf(currentLayer);
        if (currentIndex !== -1 && layers[currentIndex] + 10 <= 30) {
            const currentUpIndex = layers.indexOf(currentLayer + 10);

            for (var i = 0; i < vertices.length; i++) 
            {
                if (vertices[i][2] == layers[currentIndex]) 
                {
                    vertices[i][2] += 10;
                }
                else if (vertices[i][2] == layers[currentUpIndex]) 
                {
                    vertices[i][2] -= 10;
                }
            }

            layers[currentIndex] += 10;
            currentLayer = layers[currentIndex];
            layers[currentUpIndex] -= 10;
        }
        
        sortVerticesByLayer();
        render();
    }); 

    moveLayerDownButton.addEventListener('click', () => {
        
        // Function to decrease currentLayer and update the array
        const currentIndex = layers.indexOf(currentLayer);
        if (currentIndex !== -1 && layers[currentIndex] - 10 >= 10) {
            const currentDownIndex = layers.indexOf(currentLayer - 10);

            for (var i = 0; i < vertices.length; i++) 
            {
                if (vertices[i][2] == layers[currentIndex]) 
                {
                    vertices[i][2] -= 10;
                }
                else if (vertices[i][2] == layers[currentDownIndex]) 
                {
                    vertices[i][2] += 10;
                }
            }

            layers[currentIndex] -= 10;
            currentLayer = layers[currentIndex];
            layers[currentDownIndex] += 10;
        }

        sortVerticesByLayer();
        render();
    }); 

    layerSelect.addEventListener('change', (e) => 
    {
        selectVertices = [];
        triangleVerticesInSelect = [];
        switch (layerSelect.value) 
        {
            case "layer1":
                currentLayer = layers[0];
                break;

            case "layer2":
                currentLayer = layers[1];
                break;

            case "layer3":
                currentLayer = layers[2];
                break;
        }
        render();
    });

    saveButton.addEventListener('click', () => 
    {
        function saveArrayAsJson(data, filename) {
            // Convert the array to a JSON string
            const jsonData = JSON.stringify(data, null, 2); // The second argument (null) is for replacer function, and the third (2) is for indentation
        
            // Create a Blob with the JSON data
            const blob = new Blob([jsonData], { type: 'application/json' });
        
            // Create a Blob URL
            const blobUrl = URL.createObjectURL(blob);
        
            // Create a download link
            const downloadLink = document.createElement('a');
            downloadLink.href = blobUrl;
            downloadLink.download = filename;
        
            // Trigger a click event to initiate the download
            downloadLink.click();
        
            // Clean up by revoking the Blob URL
            URL.revokeObjectURL(blobUrl);
        }

        dataToSave = [];

        for (var i = 0; i < vertices.length; i++) 
        {
            dataToSave.push(vertices[i]);
            dataToSave.push(colorList[i]);
        }
        
        // Example usage:
        saveArrayAsJson(dataToSave, document.getElementById("filename").value);
        
        
    });

    loadButton.addEventListener('click', () => 
    {
        fileInput.click();
    });

    fileInput.addEventListener('change', function (e) {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            readFile(selectedFile);
        }
    });

    function readFile(file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            const fileContents = e.target.result;
            
            dataToParse = JSON.parse(fileContents);

            var currentIndex = 0;

            reset();

            for (var i = 0; i < dataToParse.length - 1; i += 2) 
            {
                vertices[currentIndex] = dataToParse[i];
                colorList[currentIndex] = dataToParse[i+1];

                currentIndex++;
            }

            render();
        };

        reader.readAsText(file);
    }

    canvas.onmousedown = function (e) 
    {
        if (e.button == 0) 
        {
            startDrawing = true;    
        }
        else if (e.button == 1) 
        {
            startMoving = true;
        }

        if (startMoving) 
        {
            move(e.x, e.y);
        }
        else if (startDrawing)
        {   
            if (eraseEnabled) 
            {
                erase(e.x, e.y);
            }
            else if (selectEnabled) 
            {
                var x = e.x;
                var y = e.y;

                x /= zoomFactor;
                y /= zoomFactor;

                x -= cameraPos[0];
                y -= cameraPos[1];

                var row = parseInt(y / SQUARE_SIZE);
                var col = parseInt(x / SQUARE_SIZE);
                
                var startX = col * SQUARE_SIZE;
                var startY = row * SQUARE_SIZE;

                firstCorner = vec3(startX, startY, 0);

                for (var i = 0; i < vertices.length; i++) 
                {
                    if (vertices[i][2] % 10 == 1) 
                    {
                        vertices[i][2]--;
                    }
                }
            }
            else 
            {
                draw(e.x, e.y);
            }
        }
    }

    canvas.onmouseup = function (e)
    {
        startDrawing = false;
        startMoving = false;

        if (e.button == 0 && !eraseEnabled && !selectEnabled) 
        {
            undoList.push(currentLine);
            undoColorList.push(currentColor);
            redoList = [];
            redoColorList = [];
            currentLine = [];
        }
        prevMousePos = -1;

        if (selectEnabled) 
        {
            findVerticesInsideRectangle();
        }
    }


    canvas.onmousemove = function (e) 
    {
        if (startMoving) 
        {
            move(e.x, e.y);
        }
        else if (startDrawing)
        {   
            if (eraseEnabled) 
            {
                erase(e.x, e.y);
            }
            else if (selectEnabled) 
            {
                drawSelectionRectangle(e.x, e.y);
            }
            else 
            {
                draw(e.x, e.y);
            }
        }
    }

    canvas.onmouseleave = function (e) 
    {
        if(startDrawing || startMoving)
        {
            startDrawing = false;
            startMoving = false;

            if (e.button == 0 && !eraseEnabled && !selectEnabled) 
            {
                undoList.push(currentLine);
                undoColorList.push(currentColor);
                redoList = [];
                redoColorList = [];
                currentLine = [];
            }
            prevMousePos = -1;

            if (selectEnabled) 
            {
                findVerticesInsideRectangle();
            }
        }
    }

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey) 
        {
            if (e.key == "z") 
            {
                undo();
            }
            else if (e.key == "y") 
            {
                redo();
            }
            else if (e.key == "c") 
            {
                copy();
            }
        }

        if (e.key == "w") 
        {
            for (var i = 0; i < triangleVerticesInSelect.length; i++) 
            {
                vertices[triangleVerticesInSelect[i]][1] -= SQUARE_SIZE;
                //vertices[triangleVerticesInSelect[i]][2]++;
            }
            for (var i = 0; i < selectVertices.length; i++) 
            {
                selectVertices[i][1] -= SQUARE_SIZE;
            }
            render();
        }
        else if (e.key == "s") 
        {
            for (var i = 0; i < triangleVerticesInSelect.length; i++) 
            {
                vertices[triangleVerticesInSelect[i]][1] += SQUARE_SIZE;
                //vertices[triangleVerticesInSelect[i]][2]++;
            }
            for (var i = 0; i < selectVertices.length; i++) 
            {
                selectVertices[i][1] += SQUARE_SIZE;;
            }
            updateModelViewProjectionMatrix();
            render();
        }
        else if (e.key == "a") 
        {
            for (var i = 0; i < triangleVerticesInSelect.length; i++) 
            {
                vertices[triangleVerticesInSelect[i]][0] -= SQUARE_SIZE;
                //vertices[triangleVerticesInSelect[i]][2]++;
            }
            for (var i = 0; i < selectVertices.length; i++) 
            {
                selectVertices[i][0] -= SQUARE_SIZE;
            }
            updateModelViewProjectionMatrix();
            render();
        }
        else if (e.key == "d") 
        {
            for (var i = 0; i < triangleVerticesInSelect.length; i++) 
            {
                vertices[triangleVerticesInSelect[i]][0] += SQUARE_SIZE;
                //vertices[triangleVerticesInSelect[i]][2]++;
            }
            for (var i = 0; i < selectVertices.length; i++) 
            {
                selectVertices[i][0] += SQUARE_SIZE;
            }
            updateModelViewProjectionMatrix();
            render();
        }
    });

    canvas.addEventListener('wheel', (event) => 
    {
        const zoomSpeed = 0.1; // Adjust the zoom speed as needed
        if (event.deltaY > 0) {
            // Zoom out
            zoomFactor /= (1 + zoomSpeed);
        } else {
            // Zoom in
            zoomFactor *= (1 + zoomSpeed);
        }

        // Update the projection matrix
        updateModelViewProjectionMatrix();
        render();
    });


    canvas.focus();

    //  Configure WebGL
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.7, 0.7, 0.7, 1.0 );
    gl.clear( gl.COLOR_BUFFER_BIT );

    
    //  Load shaders and initialize attribute buffers
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    updateModelViewProjectionMatrix();
};


function render() 
{
    gl.clear( gl.COLOR_BUFFER_BIT );
    sendDataToGPU();
    gl.drawArrays( gl.TRIANGLES, 0, vertices.length );   

    gl.bindBuffer( gl.ARRAY_BUFFER, rectBufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(selectVertices), gl.STATIC_DRAW );
    var aPosition = gl.getAttribLocation( program, "aPosition" );
    gl.vertexAttribPointer( aPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( aPosition );

    gl.drawArrays( gl.LINE_LOOP, 0, selectVertices.length );
}

function sendDataToGPU() 
{
    // Load the data into the GPU
    loadPositionData();
    loadColorData();
}


function loadPositionData() 
{
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );
    var aPosition = gl.getAttribLocation( program, "aPosition" );
    gl.vertexAttribPointer( aPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( aPosition );
}

function loadColorData() 
{
    gl.bindBuffer(gl.ARRAY_BUFFER, cBufferId);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colorList), gl.STATIC_DRAW );
    var aColor = gl.getAttribLocation( program, "aColor" );
    gl.vertexAttribPointer( aColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( aColor );
}

function updateModelViewProjectionMatrix() 
{
    var proj = ortho(0.0, 600.0 / zoomFactor, 600.0 / zoomFactor, 0.0, -100, 100);
    var view = translate(cameraPos[0], cameraPos[1], cameraPos[2]);

    var mvp = mult(proj, view);

    // Pass the model matrix to your shader
    const mvpLocation = gl.getUniformLocation(program, 'uMVP');
    gl.uniformMatrix4fv(mvpLocation, false, flatten(mvp));
}

function findVertices(x, y) 
{    
    x /= zoomFactor;
    y /= zoomFactor;

    x -= cameraPos[0];
    y -= cameraPos[1];

    var row = parseInt(y / SQUARE_SIZE);
    var col = parseInt(x / SQUARE_SIZE);

    if (y < 0) 
    {
        row--;
    }
    if (x < 0) 
    {
        col--;
    }
    
    var startX = col * SQUARE_SIZE;
    var startY = row * SQUARE_SIZE;
    
    var offsetX = Math.abs(x - startX);
    var offsetY = Math.abs(y - startY);

    var centerX = startX + SQUARE_SIZE / 2;
    var centerY = startY + SQUARE_SIZE / 2;
    
    var vertices = []
    
    // center will be added no matter what
    vertices.push(vec3(centerX, centerY, currentLayer));

    if (Math.abs(offsetX - SQUARE_SIZE / 2) > Math.abs(offsetY - SQUARE_SIZE / 2)) 
    {
        if (offsetX - SQUARE_SIZE / 2 > 0) 
        {
            //RIGHT TRIANGLE
            vertices.push(vec3(startX + SQUARE_SIZE, startY, currentLayer));
            vertices.push(vec3(startX + SQUARE_SIZE, startY + SQUARE_SIZE, currentLayer));
        }
        else 
        {
            //LEFT TRIANGLE
            vertices.push(vec3(startX, startY, currentLayer));
            vertices.push(vec3(startX, startY + SQUARE_SIZE, currentLayer));
        }
    }
    else 
    {
        if (offsetY - SQUARE_SIZE / 2 > 0)
        {
            //DOWN TRIANGLE
            vertices.push(vec3(startX, startY + SQUARE_SIZE, currentLayer));
            vertices.push(vec3(startX + SQUARE_SIZE, startY + SQUARE_SIZE, currentLayer));
        }
        else 
        {
            //UP TRIANGLE
            vertices.push(vec3(startX, startY, currentLayer));
            vertices.push(vec3(startX + SQUARE_SIZE, startY, currentLayer));
        }
    }

    return vertices;
}

function pixelToRatio(vertex) 
{
    var halfWidthSize = canvas.width / 2;
    var halfHeightSize = canvas.height / 2;

    vertex[0] = (vertex[0] - halfWidthSize) / halfWidthSize;
    vertex[1] = (vertex[1] - halfHeightSize) / halfHeightSize;

    return vertex;
}

function draw(x, y) 
{
    var v = findVertices(x, y);

    for (var i = 0; i < v.length; i++) 
    {
        var vertex = v[i];

        currentLine.push(vertex);
        vertices.push(vertex);
        colorList.push(currentColor);
    }

    sortVerticesByLayer();
    render();

    //console.log(vertices.length);
}

function drawSelectionRectangle(x, y) 
{
    x /= zoomFactor;
    y /= zoomFactor;

    x -= cameraPos[0];
    y -= cameraPos[1];

    var row = parseInt(y / SQUARE_SIZE);
    var col = parseInt(x / SQUARE_SIZE);
    
    var startX = col * SQUARE_SIZE;
    var startY = row * SQUARE_SIZE;

    if (prevMousePos != -1) 
    {
        selectVertices = [];
        selectVertices.push(firstCorner);
        selectVertices.push(vec3(prevMousePos[0], firstCorner[1], 0));
        selectVertices.push(vec3(prevMousePos[0], prevMousePos[1], 0));
        selectVertices.push(vec3(firstCorner[0], prevMousePos[1], 0));

        render();

    }

    prevMousePos = [startX, startY];
}

function loadSelectionRectangleInfo() 
{
    
}

function erase(x, y)
{
    var v = findVertices(x, y);

    var index = indexOfVerticesByLayer(vertices, v);

    while (index != -1) 
    {
        vertices.splice(index, 3);
        colorList.splice(index, 3);

        index = indexOfVerticesByLayer(vertices, v);
        v = findVertices(x, y);
    }

    render();

    //console.log(vertices.length);
}

function move(x, y) 
{
    if (prevMousePos != -1)  
    {
        var offsetX = (prevMousePos[0] - x) / zoomFactor;
        var offsetY = (prevMousePos[1] - y) / zoomFactor;

        cameraPos[0] -= offsetX;
        cameraPos[1] -= offsetY;
        updateModelViewProjectionMatrix();
        render();
    }

    prevMousePos = [x, y];
}

function undo() 
{
    if (undoList.length > 0) 
    {
        for (var i = 0; i < undoList[undoList.length - 1].length - 2; i += 3) 
        {
            var v = [undoList[undoList.length - 1][i], undoList[undoList.length - 1][i+1], undoList[undoList.length - 1][i+2]];
            var index = indexOfVertex(vertices, v);

            vertices.splice(index, 3);
            colorList.splice(index, 3);
        }
        
        redoList.push(undoList.pop());
        redoColorList.push(undoColorList.pop());
        
        sortVerticesByLayer();
        render();
    }
    else
    {
        console.log("No undo actions available.");
    }
}

function redo() {
    if (redoList.length > 0) {

        for (var i = 0; i < redoList[redoList.length - 1].length; i++) {
            vertices.push((redoList[redoList.length - 1])[i]);
            colorList.push(redoColorList[redoColorList.length - 1]);
        }

        undoList.push(redoList.pop());
        undoColorList.push(redoColorList.pop());

        sortVerticesByLayer();
        render();
    } else {
        console.log("No redo actions available.");
    }
}

function copy() {
    if (triangleVerticesInSelect.length > 0) {
        for (var i = 0; i < triangleVerticesInSelect.length; i++) {
            var vertexIndex = triangleVerticesInSelect[i];
            var vertex = vertices[vertexIndex];
            var color = colorList[vertexIndex];
            
            vertices.push([...vertex]);
            colorList.push([...color]);
            
            triangleVerticesInSelect[i] = vertices.length - 1;
        }
    } else {
        console.log("No copy actions available");
    }
}


function indexOfVertex(verts, v) 
{
    var v1 = v[0];
    var v2 = v[1];
    var v3 = v[2];

    for (var i = verts.length - 3; i >= 0; i -= 3) 
    {
        if (isVertexEqual(v1, verts[i])
         && isVertexEqual(v2, verts[i+1])
         && isVertexEqual(v3, verts[i+2])) 
         {
            return i
         }
    }

    return -1;
}

function indexOfVerticesByLayer(verts, v) 
{
    var v1 = v[0];
    var v2 = v[1];
    var v3 = v[2];

    for (var i = 0; i < verts.length - 2; i++) 
    {
        if (isVertexEqual(v1, verts[i])
         && isVertexEqual(v2, verts[i+1])
         && isVertexEqual(v3, verts[i+2])
         && layerCheck(verts[i])
         && layerCheck(verts[i+1])
         && layerCheck(verts[i+2])) 
         {
            return i
         }
    }

    return -1;
}


function isVertexEqual(v1, v2) 
{
    return (v1[0] == v2[0]) && (v1[1] == v2[1]) && (v1[2] == v2[2]);
}

function findVerticesInsideRectangle() 
{
    triangleVerticesInSelect = [];

    var count = 0;

    for (var i = 0; i < vertices.length - 2; i += 3) 
    {
        if (isWithinRectangle(vertices[i][0], vertices[i][1])
            && isWithinRectangle(vertices[i+1][0], vertices[i+1][1])
            && isWithinRectangle(vertices[i+2][0], vertices[i+2][1])
            && layerCheck(vertices[i])
            && layerCheck(vertices[i+1])
            && layerCheck(vertices[i+2])) 
            {
                vertices[i][2]++;
                vertices[i+1][2]++;
                vertices[i+2][2]++;

                count += 3;
            }
    }

    sortVerticesByLayer();

    for (var i = 0; i < vertices.length; i++) 
    {
        if (vertices[i][2] % 10 == 1) 
        {
            triangleVerticesInSelect.push(i);
        }
    }
}

function isWithinRectangle(vx, vy) 
{
    return vx >= Math.min(selectVertices[0][0], selectVertices[2][0]) 
    && vx <= Math.max(selectVertices[0][0], selectVertices[2][0]) 
    && vy >= Math.min(selectVertices[0][1], selectVertices[2][1]) 
    && vy <= Math.max(selectVertices[0][1], selectVertices[2][1]);
}

function reset() 
{
    undoList = [];
    undoColorList = [];
    redoList = [];
    redoColorList = [];
    currentLine = [];
    vertices = [];
    colorList = [];
    selectVertices = [];
    triangleVerticesInSelect = [];
}

function sortVerticesByLayer() 
{
    // Create an array of index pairs
    const indexPairs = vertices.map((value, index) => [value, index]);

    // Sort the index pairs based on the values in the first array
    indexPairs.sort((a, b) => a[0][2] - b[0][2]);

    // Reorder both arrays using the sorted index mapping
    vertices = indexPairs.map(pair => vertices[pair[1]]);
    colorList = indexPairs.map(pair => colorList[pair[1]]);
}

function layerCheck(vertex) 
{
    return vertex[2] == currentLayer;
}

function colorCheck(v1, v2) 
{
    return v1[0] == v2[0]
        && v1[1] == v2[1]
        && v1[2] == v2[2]
        && v1[3] == v2[3];
}