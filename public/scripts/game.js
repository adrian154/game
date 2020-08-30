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
        this.ctx.scale(this.scale, this.scale);
        this.ctx.translate(-this.scaleX, -this.scaleY);
    }

    renderWorld() {
        
        // Render world
        this.game.world.render(this.ctx);
    
    }

    render() {

        // Preserve transform
        this.ctx.resetTransform();

        // Backdrop
        this.ctx.fillStyle = "#03b6fc";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

        // Set up camera transform
        this.doCameraTransform();
        this.cameraTransform = this.ctx.getTransform();

        this.renderWorld();
        this.ctx.setTransform(this.cameraTransform);

        // Render layers here...
        this.renderWorld();

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
        this.scale = scale;
    }

    untransformCoords(x, y) {
        return mulMatrix(invertMatrix3x3(transformToMatrix(this.cameraTransform)), [[x], [y], [1]]);
    }

}

class Input {

    constructor(canvas, renderer) {

        this.canvas = canvas;
        this.renderer = renderer;
        this.scrollLevel = 0;

        this.mouseDown = false;
        this.mouseMoved = false; // Used to determine whether mouse moved in between clicks
        this.mouseX = 0; // screen
        this.mouseY = 0; // screen

        // Add event listeners
        this.canvas.addEventListener("mousedown", event => this.handleMouseDown(event));
        this.canvas.addEventListener("mouseup", event => this.handleMouseUp(event));
        this.canvas.addEventListener("mousemove", event => this.handleMouseMove(event));

        document.addEventListener("wheel", event => this.handleScroll(event));

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