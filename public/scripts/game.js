class Renderer {

    constructor(game, canvasElement) {
        
        this.game = game;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext("2d");

    }

    renderTerrain() {

        // Backdrop
        this.ctx.fillStyle = "#03b6fc";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    }

    render() {
        
        // Render layers here...
        this.renderTerrain();
        
    }

}

class Game {

    constructor() {

        this.renderer = new Renderer(this, document.getElementById("gameCanvas"));

    }

    gameLoop() {

        this.renderer.render();

        // Necessary to avoid binding issues (`this` gets dissociated)
        requestAnimationFrame(() => this.gameLoop());

    }

    start() {
        this.gameLoop();
    }

}

const game = new Game();
game.start();