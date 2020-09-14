// Main app class

// Dependencies
const Express = require("express");
const WebSocket = require("ws");

const map = require("./map.json");

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
        this.game = game;
        this.objects = [];
        this.nextObjectID = 0;
    }

    // It's assumed that the map is rectangular
    inside(x, y) {
        return x >= 0 &&  y >= 0 && x < this.data.length && y < this.data[0].length;
    }

    addSoldier(x, y) {
        let soldier = {
            type: "soldier",
            x: message.x,
            y: message.y,
            id: this.nextObjectID
        };

        this.objects.push(soldier);
        this.broadcastObjectCreation(soldier);
        this.nextObjectID++;
    }

    // Add an object based on a message payload
    handlePlaceSwarm(message, socket) {
        

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

    calculateNavGrid() {

        let width = map.length / 4;
        let height = map[0].length / 4;

        let grid = new Array(width);
        for(let i = 0; i < grid.length; i++) {
            grid[i] = new Array(height);
            for(let j = 0; j < grid[i].length; j++) {
                grid[i][j] = Infinity;
            }
        }

        // do what amounts to a breadth first search
        // this code is really bad
        // it's very GC intensive and also has awful time complexity
        // but whatever
        let front = [[32, 32]];
        let steps = 0;

        while(front.length > 0) {

            let next = [];
            for(let elem of front) {

                let x = elem[0];
                let y = elem[1];
                grid[x][y] = steps;

                for(let dx = -1; dx <= 1; dx++) {
                    for(let dy = -1; dy <= 1; dy++) {

                        // Avoid center or corners
                        if(dx == dy) continue;
                        if(!rectContains(width, height, x + dx, y + dy)) continue;

                        // If the front has not touched this tile already...
                        if(grid[x + dx][y + dy] === Infinity) {
                        
                            // Make sure this element is not already on the front
                            if(next.find(elem => elem[0] == x + dx && elem[1] == y + dy) === undefined) {
                                next.push([x + dx, y + dy]);
                            }

                        }

                    }
                }

            }

            front = next;

            steps++;

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
                    (right - left) / length,
                    (top - bottom) / length
                ];
            }
        }

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
            objects: this.map.objects
        }));

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
            placeSwarm: message => this.map.handlePlaceSwarm(message, socket)
        };

        if(handlers.hasOwnProperty(message.type)) {
            try {
                handlers[message.type](message);
            } catch(error) {
                console.error(`Error while handling message: ${error}`);
            }
        } else {
            console.log(`WARNING: Unknown message type ${message.type}, ignoring`);
        }

    }

    handleSocketClose(code, reason, socket) {

        // Remove player from list
        let index = this.players.findIndex(player => player.id === socket.player.id);
        this.players.splice(index, 1);
        this.broadcastUpdatePlayerList();

    }
    
    handleConnection(socket) {
        
        // Set up socket handlers
        socket.on("message", message => this.handleMessage(message, socket));
        socket.on("close", (code, reason) => this.handleSocketClose(code, reason, socket));

    }

    handleClose() {

    }

}

module.exports = App;