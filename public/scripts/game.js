class World {

    constructor(data) {
        
        this.terrain = data;

    }

    render(ctx) {

        // Backdrop
        ctx.fillStyle = "#03b6fc";
        ctx.fillRect(-ctx.canvas.width / 2, -ctx.canvas.height / 2, ctx.canvas.width, ctx.canvas.height);

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

        this.handleResize();
        window.addEventListener("resize", () => this.handleResize());

    }

    handleResize() {
        let box = this.canvas.getBoundingClientRect();
        this.canvas.width = box.width;
        this.canvas.height = box.height;
    }

    getCameraTransform() {
        return makeTransformFast(this.canvas.width / 2, this.canvas.height / 2, 1);
    }

    renderWorld() {

        this.ctx.setTransform(this.getCameraTransform());

        // Render world
        this.game.world.render(this.ctx);

    }

    render() {

        // Preserve transform
        this.ctx.resetTransform();

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

    untransformCoords(x, y) {
        return mulMatrix(invertMatrix3x3(transformToMatrix(this.getCameraTransform())), [[x], [y], [1]]);
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
        this.canvas.addEventListener("click", event => this.handleClick(event));

    }

    handleClick(event) {

        console.log("click");

        // Get screen coordinates
        let box = this.canvas.getBoundingClientRect();
        let x = event.clientX - box.left;
        let y = event.clientY - box.top;

        // Invert canvas transform matrix
        let worldCoords = this.renderer.untransformCoords(x, y);
        console.log(worldCoords);

    }

    handleGameStart(message) {
        
        console.log(this);
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