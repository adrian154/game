const lininp = function(x1, x2, y1, y2, t) {
    t = t - x1;
    return y1 + (t / (x2 - x1)) * (y2 - y1);
};

const quadinp = function(x1, x2, y1, y2, t) {
    t = t - x1;
    let dx = x2 - x1;
    let dx2 = dx * dx;
    return y1 + ((-((t - dx) * (t - dx)) + dx2) / dx2) * (y2 - y1);
};

class World {

    constructor(data) {
        this.terrain = data;
    }

    // Drawn in camera space
    render(ctx) {

        // Terrain
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

}

class Renderer {

    constructor(game, canvasElement) {
        
        this.game = game;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext("2d");

        this.scale = 1;
        this.cameraX = 0;
        this.cameraY = 0;

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

    doCameraTransform() {

        this.ctx.translate(this.cameraX, this.cameraY);

        this.ctx.translate(this.scaleX, this.scaleY);
        
        // interpolate scaling here
        if(this.interpScale) {
            if(this.frame < this.scaleInterpEndFrame) {
                this.scale = quadinp(this.scaleInterpStartFrame, this.scaleInterpEndFrame, this.scaleStart, this.scaleEnd, this.frame);
            } else {
                this.scale = this.scaleEnd;
                this.interpScale = false;
            }
        }

        this.ctx.scale(this.scale, this.scale);
        this.ctx.translate(-this.scaleX, -this.scaleY);

    }

    renderWorld() {
        
        // Render world
        this.game.world.render(this.ctx);
    
    }

    renderUI() {

        let taskText = "";

        if(this.game.input.currentTask == InputTask.PLACING_TWO_ENDPOINTS) {
            taskText = `Placing a wall (pick two points by clicking, ${this.game.input.points.length}/2)`;
        }

        this.ctx.textAlign = "left";
        this.ctx.font = "24px Arial";
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillText(taskText, 10, 50);

    }

    render() {

        // Preserve transform
        this.ctx.resetTransform();

        // Backdrop
        this.ctx.fillStyle = "#03b6fc";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // Pre-camera transform
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

        // Set up camera transform
        this.doCameraTransform();
        this.cameraTransform = this.ctx.getTransform();

        // Render layers...
        this.renderWorld();
        this.ctx.setTransform(this.cameraTransform);

        // draw
        this.ctx.fillStyle = "#ff0000";
        let ut = this.untransformCoords(this.game.input.mouseX, this.game.input.mouseY);
        this.ctx.fillRect(ut[0][0], ut[1][0], 5, 5);

        // Reset for UI
        this.ctx.resetTransform();

        this.renderUI();

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
        
        this.scaleX = x;
        this.scaleY = y;

        if(this.interpScale) {
            this.scaleInterpEndFrame = this.frame + 12;
            this.scaleEnd = scale;
        } else {
            this.scaleInterpStartFrame = this.frame;
            this.scaleInterpEndFrame = this.frame + 12;
            this.scaleStart = this.scale;
            this.scaleEnd = scale;
            this.interpScale = true;
        }

    }

    untransformCoords(x, y) {
        return mulMatrix(invertMatrix3x3(transformToMatrix(this.cameraTransform)), [[x], [y], [1]]);
    }

}

// Tasks
const InputTask = {
    NONE: 0, // Just scrolling, etc.
    PLACING_TWO_ENDPOINTS: 1 // Selecting two endpoints
};

Object.freeze(InputTask);

class Input {

    constructor(canvas, renderer) {

        this.canvas = canvas;
        this.renderer = renderer;
        this.scrollLevel = 0;

        this.mouseDown = false;
        this.mouseMoved = false; // Used to determine whether mouse moved in between clicks
        this.mouseX = 0; // screen
        this.mouseY = 0; // screen

        this.currentTask = InputTask.NONE;

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
        window.addEventListener("keydown", event => this.handleKey(event, false));

    }

    handleKey(event, state) {

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

        let worldc = this.renderer.untransformCoords(this.mouseX, this.mouseY);
        let wx = worldc[0][0];
        let wy = worldc[1][0];
        
        this.renderer.setScale(wx, wy, Math.pow(1.3, this.scrollLevel));

    }

    handleMouseDown(event) {
        this.mouseDown = true;
        this.mouseMoved = false;
    }

    handleMouseUp(event) {

        this.mouseDown = false;
        if(!this.mouseMoved) {
            this.handleClick(event);
        }

    }

    handleMouseMove(event) {
        
        this.mouseMoved = true;

        let box = this.canvas.getBoundingClientRect();
        this.mouseX = event.clientX - box.left;
        this.mouseY = event.clientY - box.top;

        // Drag
        if(this.mouseDown) {
            this.renderer.cameraX += event.movementX;
            this.renderer.cameraY += event.movementY;
        }

    }

    handleClick(event) {

        let worldc = this.renderer.untransformCoords(this.mouseX, this.mouseY);
        let wx = worldc[0][0];
        let wy = worldc[1][0];

        if(this.currentTask == InputTask.PLACING_TWO_ENDPOINTS) {
            this.points.push([wx, wy]);
            if(this.points.length == 2) {
                this.currentTask = InputTask.NONE;
                game.remote.sendPlaceWall(this.points);
            }
        }

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
        this.input = new Input(this.canvas, this.renderer);
        this.remote = new Remote(this.socket);

    }

    handleGameStart(message) {
    
        this.ready = true;
        
        // Set up world
        this.world = new World(message.mapData);

    }

    handleMessage(event) {

        let message = JSON.parse(event.data);
        
        // Dispatch appropriate handler
        ({
            "gameStart": message => this.handleGameStart(message),
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