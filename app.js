// Main app class

// Dependencies
const Express = require("express");
const WebSocket = require("ws");

const map = require("./map.json");

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

class Map {

    constructor(data) {
        this.data = data;
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
        this.map = new Map(map);
        this.players = [];
        this.soldiers = [];
        this.nextPlayerID = 0;
        this.nextObjectID = 0;

    }

    getAllObjects() {

        return this.soldiers;

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
            objects: this.getAllObjects()
        }));

        this.broadcastUpdatePlayerList();

    }

    handlePlaceSwarm(message) {

        let soldier = {
            type: "soldier",
            x: message.x,
            y: message.y,
            id: this.nextObjectID
        };


        this.soldiers.push(soldier);
        this.broadcastObjectCreation(soldier);
        this.nextObjectID++;

    }

    broadcastObjectCreation(object) {

        let text = JSON.stringify({
            type: "addObject",
            object: object
        });

        for(let player of this.players) {
            player.socket.send(text);
        }

    }

    broadcastUpdatePlayerList() {
        
        // Don't send more info than we need to.
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
            placeSwarm: message => this.handlePlaceSwarm(message, socket)
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