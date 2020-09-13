class Wall {

    constructor(point1, point2) {
        this.point1 = point1;
        this.point2 = point2;
    }

    render(ctx) {
        ctx.strokeStyle = "#a6a6a6";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(this.point1[0], this.point1[1]);
        ctx.lineTo(this.point2[0], this.point2[1]);
        ctx.closePath();
        ctx.stroke();
    }

}

class World {

    constructor(data) {
        this.terrain = data;
        this.objects = [];
    }

    // Drawn in camera space
    renderTerrain(ctx) {

        for(let continent of this.terrain) {

            if(continent.length < 1)
                continue;

            ctx.fillStyle = "#269e3e";
            ctx.beginPath();
            ctx.moveTo(continent[0][0], continent[0][1]);
            for(let i = 1; i < continent.length; i++) {
                ctx.lineTo(continent[i][0], continent[i][1]);
            }
            ctx.closePath();
            ctx.fill();

        }

    }

    renderObjects(ctx) {

        for(let object of this.objects) {
            let pre = ctx.getTransform();
            object.render(ctx);
            ctx.setTransform(pre);
        }

    }

    
    getContainingContinent(point) {

        for(let continent of this.terrain) {

            let isects = 0;
            for(let i = 0; i < continent.length - 1; i++) {
                
                let v0 = continent[i];
                let v1 = continent[i + 1];

                if(inRange(point[1], v0[1], v1[1])) {
                    let x = interpLinear(v0[1], v1[1], v0[0], v1[0], point[1]);
                    if(point[0] < x) {
                        isects++;
                    }
                }

            }

            if(isects % 2 == 1) {
                return continent;
            }

        }

        return undefined;

    }

    hasClearPath(point1, point2) {

        for(let continent of this.terrain) {
            for(let i = 0; i < continent.length - 1; i++) {
                if(intersects(point1, point2, continent[i], continent[i + 1])) {
                    return false;
                }
            }
        }

        return true;

    }

}

class Renderer {

    constructor(game, canvasElement) {
        
        this.game = game;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext("2d");

        this.scale = 1;
        this.cameraX = 0;
        this.cameraY = 0;
        this.cameraAngle = 0;

        // For animation, etc.
        this.frame = 0;
        this.interpScale = false;

        this.handleResize();
        window.addEventListener("resize", () => this.handleResize());

    }

    handleResize() {
        let box = this.canvas.getBoundingClientRect();
        this.canvas.width = box.width;
        this.canvas.height = box.height;
    }

    interpolateScaling() {
        if(this.interpScale) {
            if(this.frame < this.scaleInterpEndFrame) {
                this.scale = interpQuadratic(this.scaleInterpStartFrame, this.scaleInterpEndFrame, this.scaleStart, this.scaleEnd, this.frame);
            } else {
                this.scale = this.scaleEnd;
                this.interpScale = false;
            }
        }
    }

    updateAnimations() {
        this.interpolateScaling();
    }

    doCameraTransform() {
        
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.scale, this.scale);
        this.ctx.translate(this.cameraX, this.cameraY);
        this.ctx.rotate(this.cameraAngle);

        this.cameraTransform = this.ctx.getTransform();

    }

    renderUI() {

        let taskText = "";

        if(this.game.input.currentTask == InputTask.PLACING_TWO_ENDPOINTS) {
            taskText = `Placing a wall (pick two points by clicking, ${this.game.input.points.length}/2)`;
        }

        let debugText = `Scale: ${this.scale}`;

        this.ctx.textAlign = "left";
        this.ctx.font = "24px Arial";
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillText(taskText, 10, 50);
        this.ctx.fillText(debugText, 10, 70);
        
        this.ctx.fillText(`${this.cameraTransform.a}, ${this.cameraTransform.c}, ${this.cameraTransform.e}`, 10, 90);
        this.ctx.fillText(`${this.cameraTransform.b}, ${this.cameraTransform.d}, ${this.cameraTransform.f}`, 10, 110);
        this.ctx.fillText(`${0}, ${0}, ${1}`, 10, 130);

    }

    drawDebugNub() {
        let wc = this.untransformCoords(this.game.input.mouseX, this.game.input.mouseY);
        this.ctx.fillStyle = "#ff0000";
        this.ctx.fillRect(wc[0], wc[1], 5, 5);
    }

    render() {

        // Animate...
        this.updateAnimations();

        // Preserve transform
        this.ctx.resetTransform();

        // Backdrop
        this.ctx.fillStyle = "#03b6fc";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // Set up camera transform
        this.doCameraTransform();

        // Render layers...
        this.game.world.renderTerrain(this.ctx);
        
        // draw objects
        this.ctx.setTransform(this.cameraTransform);
        this.game.world.renderObjects(this.ctx);

        // draw previews
        this.ctx.setTransform(this.cameraTransform);
        this.game.input.renderPreview(this.ctx);

        // draw debug nub
        this.ctx.setTransform(this.cameraTransform);
        this.drawDebugNub();

        // draw UI
        this.ctx.resetTransform();
        this.renderUI();

        // Next frame!
        this.frame++;

    }

    renderNotReady() {

        this.ctx.globalAlpha = 0.5;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalAlpha = 1.0;

        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "64px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText("the game has not started yet", this.canvas.width / 2, this.canvas.height / 2);

    }

    setScale(x, y, scale) {

        this.zoomX = x;
        this.zoomY = y;

        if(this.interpScale) {
            this.scaleInterpEndFrame = this.frame + 1;
            this.scaleEnd = scale;
        } else {
            this.scaleInterpStartFrame = this.frame;
            this.scaleInterpEndFrame = this.frame + 1;
            this.scaleStart = this.scale;
            this.scaleEnd = scale;
            this.interpScale = true;
        }

    }

    untransformCoords(x, y) {
        return screenToWorld([x, y], this.cameraTransform);
    }

}

// Tasks
const InputTask = {
    NONE: 0, // Just scrolling, etc.
    PLACING_TWO_ENDPOINTS: 1 // Selecting two endpoints
};

Object.freeze(InputTask);

class Input {

    constructor(game, canvas, renderer) {

        this.game = game;
        this.canvas = canvas;
        this.renderer = renderer;
        this.scrollLevel = 0;

        this.mouseDown = false;
        this.mouseMoved = false; // Used to determine whether mouse moved in between clicks
        this.mouseX = 0; // screen
        this.mouseY = 0; // screen

        this.currentTask = InputTask.NONE;
        this.ctrlHeld = false; // ctrl toggles rotation mode

        // Add event listeners..
        
        // ..on canvas
        this.canvas.addEventListener("mousedown", event => this.handleMouseDown(event));
        this.canvas.addEventListener("mouseup", event => this.handleMouseUp(event));
        this.canvas.addEventListener("mousemove", event => this.handleMouseMove(event));

        // ..on buttons
        document.getElementById("putRoadButton").addEventListener("click", event => this.handleButtonClick(event, "wall"));

        // ..on document
        document.addEventListener("wheel", event => this.handleScroll(event));

        // ..on window
        window.addEventListener("keydown", event => this.handleKey(event, true));
        window.addEventListener("keyup", event => this.handleKey(event, false));

    }

    handleKey(event, state) {

        // Don't listen to repeat events
        if(event.repeat) return;

        console.log(event.key, state);

        if(event.key === "Control") {
            this.ctrlHeld = state;
        }

        if(this.currentTask == InputTask.PLACING_TWO_ENDPOINTS && event.key === "escape") {
            this.currentTask = InputTask.NONE;
        }

    }

    handleButtonClick(event, which) {

        if(which === "wall") {
            this.currentTask = InputTask.PLACING_TWO_ENDPOINTS;
            this.points = [];
        }

    }

    handleScroll(event) {
        
        let fac = event.deltaY > 0 ? -1 : 1;
        this.scrollLevel += fac;

        this.renderer.setScale(this.mouseX, this.mouseY, Math.pow(1.2, this.scrollLevel));

    }

    handleMouseDown(event) {
        this.mouseDown = true;
        this.mouseMoved = false;

        event.preventDefault();
    }

    handleMouseUp(event) {

        this.mouseDown = false;
        if(!this.mouseMoved) {
            this.handleClick(event);
        }

        event.preventDefault();
    }

    handleMouseMove(event) {
        
        this.mouseMoved = true;

        this.mouseX = event.offsetX;
        this.mouseY = event.offsetY;

        // Drag
        if(this.mouseDown) {
            if(this.ctrlHeld) {
                let angleBefore = Math.atan2(this.mouseY - event.movementY - this.canvas.height / 2, this.mouseX - event.movementX - this.canvas.width / 2);
                let angleNow = Math.atan2(this.mouseY - this.canvas.height / 2, this.mouseX - this.canvas.width / 2);
                this.renderer.cameraAngle += angleNow - angleBefore;
            } else {
                this.renderer.cameraX += event.movementX;
                this.renderer.cameraY += event.movementY;
            }
        }

        if(this.currentTask == InputTask.PLACING_TWO_ENDPOINTS) {
            this.worldCoords = this.renderer.untransformCoords(this.mouseX, this.mouseY);;
        }

        event.preventDefault();

    }

    handleClick(event) {

        this.worldCoords = this.renderer.untransformCoords(this.mouseX, this.mouseY);;

        if(this.currentTask == InputTask.PLACING_TWO_ENDPOINTS) {
    
            if(this.points.length == 0) {
                this.points.push(this.worldCoords);
            } else if(this.game.world.hasClearPath(this.points[0], this.worldCoords)) {
                this.points.push(this.worldCoords);
            }

            if(this.points.length == 2) {
                this.currentTask = InputTask.NONE;
                game.remote.sendPlaceWall(this.points);
            }

        }

    }

    // Draw preview for stuff
    renderPreview(ctx) {

        ctx.globalAlpha = 0.5;

        if(this.currentTask == InputTask.PLACING_TWO_ENDPOINTS) {

            if(this.points.length == 1) {
                let previewObj = new Wall(this.points[0],  this.worldCoords);
                console.log(this.points[0], this.worldCoords);
                previewObj.render(ctx);
            }

        }

        ctx.globalAlpha = 1.0;

    }

}

class Remote {

    constructor(socket) {
        this.socket = socket;
    }

    sendPlaceWall(points) {
        this.socket.send(JSON.stringify({
            type: "placeWall",
            points: points
        }));
    }

}

class Game {

    constructor() {

        this.socket = new WebSocket(`ws://${window.location.host}:8080`);
        this.ready = false;

        this.socket.addEventListener("message", event => this.handleMessage(event));
        this.socket.addEventListener("close", event => this.ready = false);

        this.canvas = document.getElementById("gameCanvas");
        this.renderer = new Renderer(this, this.canvas);
        this.input = new Input(this, this.canvas, this.renderer);
        this.remote = new Remote(this.socket);

    }

    handleGameStart(message) {
    
        this.ready = true;
        
        // Set up world
        this.world = new World(message.mapData);

    }

    handleAddObject(message) {
        
        // convert JSON object to real object
        let transformers = {
            "wall": obj => new Wall(obj.point1, obj.point2),
        };

        this.world.objects.push(transformers[message.object.type](message.object));

    }

    handleMessage(event) {

        let message = JSON.parse(event.data);
        
        // Dispatch appropriate handler
        ({
            "gameStart": message => this.handleGameStart(message),
            "addObject": message => this.handleAddObject(message)
        })[message.type](message);

    }

    handleClose(event) {

    }
    
    gameLoop() {

        if(!this.ready) {

            // Render game-not-started message.
            this.renderer.renderNotReady();

        } else {

            // Render
            this.renderer.render();        
        
        }

        requestAnimationFrame(() => this.gameLoop());

    }

    start() {
        this.gameLoop();
    }

}

const game = new Game();
game.start();