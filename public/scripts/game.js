//const mapdata = "[[[-105,-19],[-103,-30],[-84,-37],[-62,-38],[-46,-25],[-44,-14],[-41,1],[-51,15],[-62,35],[-82,47],[-96,75],[-98,91],[-63,110],[-53,117],[-36,126],[-25,117],[-14,110],[-13,95],[-18,79],[-22,45],[-21,41],[-3,37],[11,47],[20,69],[22,95],[21,141],[28,179],[4,204],[-45,216],[-101,213],[-125,207],[-136,203],[-144,193],[-150,184],[-161,171],[-166,148],[-169,127],[-167,87],[-177,37],[-183,11],[-183,-14],[-183,-14],[-172,-27],[-156,-41],[-135,-38],[-115,-36],[-107,-25]],[],[[85,-160],[36,-146],[-10,-125],[-3,-42],[82,1],[92,-66],[102,-64],[104,-55],[104,-46],[104,-35],[107,-25],[122,-24],[128,-24],[141,-48],[138,-70],[145,-102],[141,-128],[122,-163],[112,-189],[100,-204],[70,-207],[23,-212],[-50,-191],[-120,-152],[-119,-150],[-106,-139],[-80,-149],[-53,-158],[-47,-162],[0,-171],[24,-188],[40,-177],[56,-167],[76,-163],[86,-158]]]";

class World {

    constructor(JSONData) {
        
        this.terrain = JSON.parse(JSONData);

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
        //this.world = new World(mapdata);

    }

    handleGameStart(message) {
        
        ready = true;

    }

    handleMessage(event) {

        let message = JSON.parse(event.data);
        
        // Dispatch appropriate handler
        ({
            "gameStart": this.handleGameStart,
        })[message.type](message);

    }

    handleClose(event) {

    }
    
    gameLoop() {

        if(!this.ready) {

            // Render game-not-started message.
            this.renderer.renderNotReady();

        } else {

            this.renderer.render();

            // The function is necessary to avoid binding issues (`this` gets dissociated)
            requestAnimationFrame(() => this.gameLoop());
        
        }

    }

    start() {
        this.gameLoop();
    }

}

const game = new Game();
game.start();