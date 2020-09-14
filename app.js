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
        this.nextPlayerID = 0;
        
    }

    handleJoinGame(message, socket) {

        let player = {
            name: message.name,
            id: this.nextPlayerID
        };

        this.players.push(player);
        this.nextPlayerID++;
        socket.player = player;

        console.log(this.players);

        // Send gamestart
        socket.send(JSON.stringify({
            type: "gameStart",
            mapData: this.map.data
        }));

    }

    handleMessage(message, socket) {   
        
        message = JSON.parse(message);

        // Dispatch handler
        let handlers = {
            joinGame: message => this.handleJoinGame(message, socket)
        };

        if(handlers.hasOwnProperty(message.type)) {
            try {
                handlers[message.type](message);
            } catch(error) {
                console.log(`Error while handling message: ${error}`);
            }
        } else {
            console.log(`WARNING: Unknown message type ${message.type}, ignoring`);
        }

    }

    handleConnection(socket) {
        
        // Set up socket handlers
        socket.on("message", message => this.handleMessage(message, socket));

    }

    handleClose() {
        


    }

}

module.exports = App;