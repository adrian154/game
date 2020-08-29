// Main app class

// Dependencies
const Express = require("express");
const WebSocket = require("ws");
const optional = require("./optional.js");

class App {

    constructor(options) {

        this.initHTTPServ(optional(options, "httpPort", 80));
        this.initWSServ(optional(options, "wsPort", 8080));
    
    }

    initHTTPServ(port) {

        this.httpServ = Express();

        this.httpServ.use("/", Express.static("public"));

        this.httpServ.listen(port, () => {
            console.log(`HTTP server listening on port ${port}`);
        });

    }

    initWSServ(port) {

        this.wsServ = new WebSocket.Server({
            port: port
        });

        console.log(`Websocket server listening on port ${port}`);

    }

}

module.exports = App;