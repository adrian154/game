// Constants
const Tiles = {
    WATER: 0,
    GRASS: 1
};

const GameStates = {
    AWATING_SOCKET: 0,
    AWAITING_GAME_START: 1,
    GAME_RUNNING: 2,
    SOCKET_CLOSED: 3
};

const InputTasks = {
    NONE: 0,
    PLACING_SWARM: 1,
    SETTING_TARGET: 2
};

Object.freeze(Tiles);
Object.freeze(GameStates);
Object.freeze(InputTasks);

// Note to self on rendering:
// Top level rendering functions call lower level rendering functions
// Bottom level rendering functions are responsible for saving and restoring canvas state

class Soldier {

    constructor(object) {
        this.x = object.x;
        this.y = object.y;
        this.id = object.id;
    }

    update(object) {
        this.x = object.x;
        this.y = object.y;
    }

    render(ctx) {
        ctx.save();
        ctx.fillStyle = "#ffff00";
        ctx.translate(this.x, this.y);
        //ctx.fillRect(-0.5, -0.5, 1, 1);
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

}

class World {

    constructor(data) {
        
        this.data = data;
        this.objects = [];

        // It's assumed that the map is square
        this.width = data.length;
        this.height = data[0].length;
        
        this.offscreenCanvas = document.getElementById("worldCanvas");
        this.offscreenCanvas.width = this.width;
        this.offscreenCanvas.height = this.height;

        this.drawCtx = this.offscreenCanvas.getContext("2d");
        this.drawCtx.imageSmoothingEnabled = false;
        this.updateCanvas();

    
    }

    static getColor(tileType) {
        return ({
            [Tiles.WATER]: "#00a2e8",
            [Tiles.GRASS]: "#11d44a"
        })[tileType];
    }

    // Redraw the contents of the offscreen canvas
    // Don't call this method when an update is received from the server
    // Certainly don't call it on every frame!
    // Ideally, this only needs to be called upon initialization
    updateCanvas() {

        for(let x = 0; x < this.data.length; x++) {
            for(let y = 0; y < this.data[x].length; y++) {
                this.drawCtx.fillStyle = World.getColor(this.data[x][y]);
                this.drawCtx.fillRect(x, y, 1, 1);
            }
        }
    
    }

    // Apply a tile update from the server
    applyUpdate(update) {
        // TODO
    }

    // Terrain is rendered to an OffscreenCanvas that is blitted to the real canvas.
    // The offscreen canvas is asynchronously updated when updates come from the server
    // This avoids iterating over the entire map every frame
    render(ctx) {
        this.renderTerrain(ctx);
        this.renderObjects(ctx);
    }

    renderTerrain(ctx) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.offscreenCanvas, -this.offscreenCanvas.width / 2, -this.offscreenCanvas.height / 2);
        ctx.imageSmoothingEnabled = true;
        ctx.restore();
    }

    addObject(object) {
        let classes = {
            "soldier": Soldier
        };

        this.objects.push(new classes[object.type](object));
    }

    renderObjects(ctx) {
        for(let object of this.objects) {
            object.render(ctx);
        }
    }

    updateObjects(objects) {
        
        // Awful O(N^2) 
        for(let object of objects) {

            // Find element in objects
            for(let localObject of this.objects) {
                if(localObject.id === object.id) {
                    for(let [key, value] of Object.entries(object)) {
                        localObject[key] = value;
                    }
                }
            }

        }

    }

}

// This class is having a bit of an identity crisis
class Renderer {

    constructor(game, canvasElement) {
        
        this.game = game;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext("2d");

        // Initial camera settings
        this.scale = 1;
        this.cameraX = 0;
        this.cameraY = 0;
        this.cameraAngle = 0;

        // For animation
        this.frame = 0;
        this.interpScale = false;

        this.handleResize();
        window.addEventListener("resize", () => this.handleResize());

    }

    handleResize() {

        // Keep the canvas's native size identical to its actual size
        // This helps avoid scaling
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

    // this is the source of much misery over the past month
    doCameraTransform() {
        
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.scale, this.scale);
        this.ctx.translate(this.cameraX, this.cameraY);
        this.ctx.rotate(this.cameraAngle);

        this.cameraTransform = this.ctx.getTransform();

    }

    renderUI() {


        let curTask = Object.keys(InputTasks).find(key => InputTasks[key] === this.game.input.currentTask);
        this.ctx.textAlign = "left";
        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "24px Monospace";
        this.ctx.fillText(`Active input task: ${curTask}`, 10, 24);

    }

    render() {

        if(this.game.state === GameStates.GAME_RUNNING) {
            this.renderGame();
        } else {
            
            this.ctx.fillStyle = "#000000";
            this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

            this.ctx.fillStyle = "#ffffff";
            this.ctx.font = "24px Arial";
            this.ctx.textAlign = "center";
            
            let text;
            switch(this.game.state) {
                case GameStates.AWAITING_GAME_START: text = "waiting for the game to start..."; break;
                case GameStates.AWAITING_SOCKET: text = "connecting to the remote server..."; break;
                case GameStates.SOCKET_CLOSED: text = "remote connection was closed :("; break;
                default: text = "something extremely bad happened"; break;
            }

            this.ctx.fillText(text, this.ctx.canvas.width / 2, this.ctx.canvas.height / 2);
            this.ctx.fillText("if this is unexpected, reload the page", this.ctx.canvas.width / 2, this.canvas.height / 2 + 24);
        
        }

    }

    renderGame() {

        // Animate...
        this.updateAnimations();

        // Preserve transform
        this.ctx.resetTransform();

        // Backdrop
        this.ctx.fillStyle = "#00A2E8";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // Set up camera transform
        this.doCameraTransform();

        // Render layers...
        this.game.world.renderTerrain(this.ctx);
        
        // draw objects
        this.ctx.setTransform(this.cameraTransform);
        this.game.world.renderObjects(this.ctx);

        // draw UI
        this.ctx.resetTransform();
        this.renderUI();

        // Next frame!
        this.frame++;
        
    }

    setScale(x, y, scale) {

        this.zoomX = x;
        this.zoomY = y;

        if(this.interpScale) {
            this.scaleInterpEndFrame = this.frame + 10;
            this.scaleEnd = scale;
        } else {
            this.scaleInterpStartFrame = this.frame;
            this.scaleInterpEndFrame = this.frame + 10;
            this.scaleStart = this.scale;
            this.scaleEnd = scale;
            this.interpScale = true;
        }

    }

    untransformCoords(x, y) {
        return screenToWorld([x, y], this.cameraTransform);
    }

}

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

        this.currentTask = InputTasks.NONE;
        this.ctrlHeld = false; // ctrl toggles rotation mode

        // Add event listeners..
        
        // ..on canvas
        this.canvas.addEventListener("mousedown", event => this.handleMouseDown(event));
        this.canvas.addEventListener("mouseup", event => this.handleMouseUp(event));
        this.canvas.addEventListener("mousemove", event => this.handleMouseMove(event));

        // ..on buttons

        // ..on document
        document.addEventListener("wheel", event => this.handleScroll(event));

        // ..on window
        window.addEventListener("keydown", event => this.handleKey(event, true));
        window.addEventListener("keyup", event => this.handleKey(event, false));

    }

    createButton(text, func) {
        let button = document.createElement("button");
        button.appendChild(document.createTextNode(text));
        button.addEventListener("click", func);
        return button;
    }

    addGameUI() {

        let tab = document.getElementById("gameTab");

        this.placeSwarmButton = this.createButton("Place Swarm", () => this.currentTask = InputTasks.PLACING_SWARM);
        tab.appendChild(this.placeSwarmButton);

        this.setTargetButton = this.createButton("Set Target", () => this.currentTask = InputTasks.SETTING_TARGET);
        tab.appendChild(this.setTargetButton);

        tab.appendChild(this.placeSwarmButton);
        
    }

    handleKey(event, state) {

        // Don't listen to repeat events
        if(event.repeat) return;

        console.log(event.key);

        if(event.key === "Control") {
            this.ctrlHeld = state;
        }

        if(event.key === "Escape") {
            this.currentTask = InputTasks.NONE;
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
                this.renderer.cameraX += event.movementX / this.renderer.scale;
                this.renderer.cameraY += event.movementY / this.renderer.scale;
            }
        }

        event.preventDefault();

    }

    handleClick(event) {

        let worldCoords = this.renderer.untransformCoords(event.offsetX, event.offsetY);
        
        if(this.currentTask === InputTasks.PLACING_SWARM) {
            this.game.remote.placeSwarm(worldCoords[0], worldCoords[1]);
            this.currentTask = InputTasks.NONE;
        } else if(this.currentTask === InputTasks.SETTING_TARGET) {
            this.game.remote.setTarget(worldCoords[0], worldCoords[1]);
            this.currentTask = InputTasks.NONE;
        }

    }

}

class Remote {

    constructor(socket) {
        this.socket = socket;
    }

    placeSwarm(x, y) {
        this.socket.send(JSON.stringify({
            type: "placeSwarm",
            x: x,
            y: y
        }));
    }

    setTarget(x, y) {
        this.socket.send(JSON.stringify({
            type: "setTarget",
            x: x,
            y: y
        }));
    }

}

class Game {

    constructor() {

        // Connect to server
        this.socket = new WebSocket(`ws://${window.location.host}:8080`);
        this.state = GameStates.AWAITING_SOCKET;

        // Set up websocket event listeners
        this.socket.addEventListener("open", event => this.handleConnect());
        this.socket.addEventListener("message", event => this.handleMessage(event));
        this.socket.addEventListener("close", event => { this.state = GameStates.SOCKET_CLOSED });

        // Get game canvas
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.ctx.imageSmoothingEnabled = false;
        
        // Set up helper classes
        this.renderer = new Renderer(this, this.canvas);
        this.input = new Input(this, this.canvas, this.renderer);
        this.remote = new Remote(this.socket);

    }

    handleConnect() {

        this.state = GameStates.AWAITING_GAME_START;

        // Create pick-name fields
        let tab = document.getElementById("gameTab");
        
        this.pickNameInput = document.createElement("input");
        this.pickNameInput.placeholder = "Choose a name...";
        
        this.pickNameButton = document.createElement("button");
        this.pickNameButton.appendChild(document.createTextNode("Join"));
        
        // Dirty closure code
        let socket = this.socket;
        let namePicker = this.pickNameInput;

        this.pickNameButton.addEventListener("click", function() {
            socket.send(JSON.stringify({
                type: "joinGame",
                name: namePicker.value
            }));
        });

        tab.appendChild(this.pickNameInput);
        tab.appendChild(this.pickNameButton);

    }

    handleGameStart(message) {
    
        this.state = GameStates.GAME_RUNNING;
        
        // Set up world
        this.world = new World(message.mapData);
        this.navgrid = message.debugNavgrid;

        for(let object of message.objects) {
            this.world.addObject(object);
        }

        // Remove name pick fields
        this.pickNameInput.remove();
        this.pickNameButton.remove();

        // Add UI
        this.input.addGameUI();

    }

    handleAddObject(message) {
        this.world.addObject(message.object);
    }

    handleUpdateWorld(message) {

        // ... dispatch world's update method

    }

    handleUpdateObjects(message) {  
        this.world.updateObjects(message.objects);
    }

    handleUpdatePlayerList(message) {
        document.getElementById("playerList").innerHTML = "<b>Players:</b> " + message.players.join(", ");
    }

    handleChatMessage(message) {
        document.getElementById("chatArea").value += message.text + "\n";
    }

    handleMessage(event) {

        let message = JSON.parse(event.data);
        
        // Dispatch appropriate handler
        ({
            "gameStart": message => this.handleGameStart(message),
            "addObject": message => this.handleAddObject(message),
            "updatePlayerList": message => this.handleUpdatePlayerList(message),
            "updateWorld": message => this.handleUpdateWorld(message),
            "updateObjects": message => this.handleUpdateObjects(message),
            "chatMessage": message => this.handleChatMessage(message)
        })[message.type](message);

    }
    
    gameLoop() {
        this.renderer.render();        
        requestAnimationFrame(() => this.gameLoop());
    }

    start() {
        this.gameLoop();
    }

}

const game = new Game();
game.start();