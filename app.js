// Main app class

// Dependencies
const Express = require("express");
const WebSocket = require("ws");

// temp: map
let mapData = [[[-105,-19],[-103,-30],[-84,-37],[-62,-38],[-46,-25],[-44,-14],[-41,1],[-51,15],[-62,35],[-82,47],[-96,75],[-98,91],[-63,110],[-53,117],[-36,126],[-25,117],[-14,110],[-13,95],[-18,79],[-22,45],[-21,41],[-3,37],[11,47],[20,69],[22,95],[21,141],[28,179],[4,204],[-45,216],[-101,213],[-125,207],[-136,203],[-144,193],[-150,184],[-161,171],[-166,148],[-169,127],[-167,87],[-177,37],[-183,11],[-183,-14],[-183,-14],[-172,-27],[-156,-41],[-135,-38],[-115,-36],[-107,-25]],[],[[85,-160],[36,-146],[-10,-125],[-3,-42],[82,1],[92,-66],[102,-64],[104,-55],[104,-46],[104,-35],[107,-25],[122,-24],[128,-24],[141,-48],[138,-70],[145,-102],[141,-128],[122,-163],[112,-189],[100,-204],[70,-207],[23,-212],[-50,-191],[-120,-152],[-119,-150],[-106,-139],[-80,-149],[-53,-158],[-47,-162],[0,-171],[24,-188],[40,-177],[56,-167],[76,-163],[86,-158]]];

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

        // some quick n dirty closures
        this.wsServ.on("connection", socket => this.handleConnection(socket));
        this.wsServ.on("close", () => this.handleClose());

    }

    handleMessage(message) {

        

    }

    handleConnection(socket) {
        
        // Set up socket handlers
        socket.on("message", this.handleMessage);

        // Send gamestart
        socket.send(JSON.stringify({
            type: "gameStart",
            mapData: mapData
        }))

    }

    handleClose() {
    

    }

}

module.exports = App;