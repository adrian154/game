class World {

    constructor(data) {
        
        this.terrain = data;

    }

    render(ctx) {

        // Backdrop
        ctx.fillStyle = "#03b6fc";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Transform
        ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);

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
        console.log("resized!");
        let box = this.canvas.getBoundingClientRect();
        this.canvas.width = box.width;
        this.canvas.height = box.height;
    }

    render() {

        // Preserve transform
        let preTransform = this.ctx.getTransform();

        // Render layers here...
        this.game.world.render(this.ctx);
        this.ctx.setTransform(preTransform);

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

}

class Game {

    constructor() {

        this.socket = new WebSocket(`ws://${window.location.host}:8080`);
        this.ready = false;

        this.socket.addEventListener("message", event => this.handleMessage(event));
        this.socket.addEventListener("close", event => this.ready = false);

        this.renderer = new Renderer(this, document.getElementById("gameCanvas"));

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