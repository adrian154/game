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

        this.map = new Map(map);

    }

    handlePlaceWall(message) {

        // Assume the wall is valid.
        for(let socket of this.wsServ.clients) {
            socket.send(JSON.stringify({
                type: "addObject",
                object: {
                    type: "wall",
                    point1: message.points[0],
                    point2: message.points[1]
                }
            }));
        }

    }

    handleMessage(message, socket) {   
        
        message = JSON.parse(message);

        // Dispatch handler
        let handlers = {
            placeWall: message => this.handlePlaceWall(message)
        };

        if(handlers.hasOwnProperty(message.type)) {
            (handlers[message.type])(message);
        } else {
            console.log(`WARNING: Unknown message type ${message.type}, ignoring`);
        }

    }

    handleConnection(socket) {
        
        // Set up socket handlers
        socket.on("message", message => this.handleMessage(message, socket));

        // Send gamestart
        socket.send(JSON.stringify({
            type: "gameStart",
            mapData: this.map.data
        }));

    }

    handleClose() {
        


    }

}

module.exports = App;