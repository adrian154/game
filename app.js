// Main app class

// Dependencies
const Express = require("express");
const WebSocket = require("ws");
const map = require("./map.json");

// Constants
const Tiles = {
    WATER: 0,
    GRASS: 1
};

Object.freeze(Tiles);

// Utility funcs
const rectContains = function(width, height, x, y) {
    return x >= 0 && y >= 0 && x < width && y < height;
}

class App {

    constructor(options) {

        this.initHTTPServ(80);
        this.gameServer = new GameServer();
    
    }

    initHTTPServ(port) {

        this.httpServ = Express();
        this.httpServ.use("/", Express.static("public"));
        this.httpServ.listen(port, () => {
            console.log(`Web server started on port ${port}`);
        });

    }

}

class World {

    constructor(data, game) {
        this.data = data;
        this.width = data.length;
        this.height = data[0].length;
        this.game = game;
        this.objects = [];
        this.nextObjectID = 0;

        this.navgrid = this.calculateNavGrid(0, 0);
        setInterval(() => this.update(), 50);
    }

    // It's assumed that the map is rectangular
    // Check if indices are inside map
    inside(x, y) {
        return x >= 0 &&  y >= 0 && x < this.data.length && y < this.data[0].length;
    }

    // Check if world point is inside map
    contains(x, y) {
        return x > -this.width / 2 && y > -this.height / 2 && x < this.width / 2 && y < this.height / 2;
    }

    addSoldier(x, y) {

        let soldier = {
            type: "soldier",
            x: x,
            y: y,
            dx: 0,
            dy: 0,
            id: this.nextObjectID
        };

        this.objects.push(soldier);
        this.broadcastObjectCreation(soldier);
        this.nextObjectID++;
        
    }

    // Add an object based on a message payload
    handlePlaceSwarm(message, socket) {

        // Add tons of soldiers
        for(let i = 0; i < 1; i++) {
            let angle = Math.random() * 2 * Math.PI;
            let dist = Math.random()  * 20;
            this.addSoldier(message.x + Math.cos(angle) * dist, message.y + Math.sin(angle) * dist);
        }

    }

    handleSetTarget(message, socket) {
        this.navgrid = this.calculateNavGrid(message.x, message.y);
    }

    broadcastObjectCreation(object) {

        let text = JSON.stringify({
            type: "addObject",
            object: object
        });

        for(let player of this.game.players) {
            player.socket.send(text);
        }

    }

    broadcastObjectUpdate(object) {

        let text = JSON.stringify({
            type: "updateObjects",
            objects: this.objects
        });

        for(let player of this.game.players) {
            player.socket.send(text);
        }

    }

    // Move everything
    update() {

        // Update soldiers (pathfind)
        for(let object of this.objects) {
            if(object.type === "soldier") {
                
                // Move according to navgrid for now
                if(this.contains(object.x, object.y)) {

                    let navVector = this.navgrid[Math.floor(object.x + this.navgrid.length / 2)][Math.floor(object.y +  + this.navgrid[0].length / 2)];

                    // Don't use bad nav vectors
                    if(navVector !== undefined) {

                        // Calculate steering vector
                        object.x += navVector[0];
                        object.y += navVector[1];
                        object.dx *= 0.9;
                        object.dy *= 0.9;
                        object.x += object.dx;
                        object.y += object.dy;
                        //console.log(navVector);
                        
                    }

                }

            } 
        }

        this.broadcastObjectUpdate();

    }

    isTraversable(tileType) {
        return ({
            [Tiles.WATER]: false,
            [Tiles.GRASS]: true
        })[tileType];
    }

    getNavCost(tileType) {
        return ({
            [Tiles.WATER]: 1, // placeholder
            [Tiles.GRASS]: 1 
        })[tileType];
    }

    calculateNavGrid(x, y) {

        // Make sure target is inside map.
        if(!this.contains(x, y)) {
            throw new Error("Can't pathfind to point outside map.");
        }

        // Create distance grid.
        let width = map.length;
        let height = map[0].length;
        let grid = new Array(width);
        for(let i = 0; i < grid.length; i++) {
            grid[i] = new Array(height);
            for(let j = 0; j < grid[i].length; j++) {
                grid[i][j] = undefined;
            }
        }

        // Do what is essentially a breadth-first search
        let startX = Math.floor(x + width / 2);
        let startY = Math.floor(y + height / 2);
        let front = [[startX, startY]];

        // Center of wavefront has a cost of 0
        grid[startX][startY] = 0;

        // Search
        while(front.length > 0) {

            // Move to the next wavefront
            let numAdded = 0;
            while(front.length > numAdded) {
                
                let elem = front.pop();
                let x = elem[0];
                let y = elem[1];
                let oldCost = grid[x][y];

                for(let dx = -1; dx <= 1; dx++) {
                    for(let dy = -1; dy <= 1; dy++) {

                        // Avoid center/corners of neighborhood, they're difficult
                        if(dx != 0 && dy != 0) continue;

                        // Check bounds
                        if(!rectContains(width, height, x + dx, y + dy)) continue;

                        let nextX = x + dx;
                        let nextY = y + dy;

                        let navCost = this.getNavCost(map[nextX][nextY]);
                        if(grid[nextX][nextY] === undefined) {
                            grid[nextX][nextY] = oldCost + navCost;
                            front.push([nextX, nextY]);
                        }

                    } 
                }

            }

        }

        // convert distance grid to vectors
        let vectorGrid = new Array(width);
        for(let i = 0; i < vectorGrid.length; i++) {
            vectorGrid[i] = new Array(height);
            for(let j = 0; j < vectorGrid[i].length; j++) {

                let left = i - 1 >= 0 ? grid[i - 1][j] : 0;
                let right = i + 1 < grid.length ? grid[i + 1][j] : 0;
                let bottom = j - 1 >= 0 ? grid[i][j - 1] : 0;
                let top = j + 1 < grid[i].length ? grid[i][j + 1] : 0;

                let length = Math.sqrt((right - left) * (right - left) + (top - bottom) * (top - bottom));

                vectorGrid[i][j] = [
                    (left - right) / length,
                    (bottom - top) / length
                ];

            }
        }

        // Set vector at origin to an arbitrary vector to avoid singularity issues
        vectorGrid[startX][startY] = [1, 0];
        console.log(vectorGrid);
        return vectorGrid;

    }

}

class GameServer {

    constructor() {

        this.wsServ = new WebSocket.Server({
            port: 8080
        });

        // some quick n dirty closures
        this.wsServ.on("connection", socket => this.handleConnection(socket));
        this.wsServ.on("close", () => this.handleClose());

        // game data
        this.map = new World(map, this);
        this.players = [];
        this.nextPlayerID = 0;

    }

    handleJoinGame(message, socket) {

        let player = {
            name: message.name,
            id: this.nextPlayerID,
            socket: socket
        };

        this.players.push(player);
        this.nextPlayerID++;
        socket.player = player;

        // Send gamestart
        socket.send(JSON.stringify({
            type: "gameStart",
            mapData: this.map.data,
            objects: this.map.objects,
            debugNavgrid: this.map.navgrid
        }));

        this.broadcastChatMessage(`Player ${player.name} joined the game`);
        this.broadcastUpdatePlayerList();

    }

    broadcastUpdatePlayerList() {
        
        // Don't send more info than we need to
        // This avoids leaking IPs
        let text = JSON.stringify({
            type: "updatePlayerList",
            players: this.players.map(player => player.name)
        });

        for(let player of this.players) {
            player.socket.send(text);
        }

    }

    handleMessage(message, socket) {
        
        message = JSON.parse(message);

        // Dispatch handler
        let handlers = {
            joinGame: message => this.handleJoinGame(message, socket),
            placeSwarm: message => this.map.handlePlaceSwarm(message, socket),
            chatMessage: message => this.handleChatMessage(message, socket),
            setTarget: message => this.map.handleSetTarget(message, socket)
        };

        if(handlers.hasOwnProperty(message.type)) {
            try {
                handlers[message.type](message);
            } catch(error) {
                console.error(`Error while handling message: ${error.stack}`);
            }
        } else {
            console.log(`WARNING: Unknown message type ${message.type}, ignoring`);
        }

    }

    handleChatMessage(message, socket) {
        this.broadcastChatMessage(`${socket.player.name}: ${message.message}`);
    }

    broadcastChatMessage(message) {
        let text = JSON.stringify({
            type: "chatMessage",
            text: message
        })
    
        for(let player of this.players) {
            player.socket.send(text);
        }
    }

    handleSocketClose(code, reason, socket) {

        // Remove player from list
        let index = this.players.findIndex(player => player.id === socket.player.id);
        this.players.splice(index, 1);
        this.broadcastUpdatePlayerList();
        this.broadcastChatMessage(`Player ${socket.player.name} left the game`);

    }
    
    handleConnection(socket) {
        
        // Set up socket handlers
        socket.on("message", message => this.handleMessage(message, socket));
        socket.on("close", (code, reason) => this.handleSocketClose(code, reason, socket));

    }

    handleClose() {

        // This is for the SERVER closing, not a user's socket.

    }

}

module.exports = App;