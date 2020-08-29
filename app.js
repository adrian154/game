// Main app class

// Dependencies
const Express = require("express");
const WebSocket = require("ws");

class App {

    constructor(options) {

        this.initHTTPServ(80);
        this.gameServer = new GameServer();
    
    }

    initHTTPServ(port) {

        this.httpServ = Express();

        this.httpServ.use("/", Express.static("public"));

        this.httpServ.listen(port);

    }

}

class GameServer {

    constructor() {

        this.wsServ = new WebSocket.Server({
            port: 8080
        });

        this.wsServ.on("connection", this.handleConnection);
        this.wsServ.on("close", this.handleClose);

    }

    handleConnection(socket) {
        console.log("connect");
    }

    handleClose() {
        console.log("close");
    }

}

module.exports = App;