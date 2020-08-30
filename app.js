// Main app class

// Dependencies
const Express = require("express");
const WebSocket = require("ws");

// temp: map
let mapData = [[[-222,148],[-191,210],[-88,223],[-52,222],[-19,214],[-2,205],[1,192],[6,178],[11,167],[13,150],[9,132],[1,116],[-9,100],[-20,81],[-28,65],[-38,45],[-29,34],[-26,30],[-8,22],[6,22],[21,32],[25,45],[35,72],[34,92],[45,115],[68,124],[96,121],[105,114],[110,94],[110,78],[109,63],[109,47],[109,31],[109,11],[110,-14],[110,-37],[101,-49],[85,-59],[60,-73],[46,-81],[-4,-99],[-6,-107],[-3,-120],[10,-131],[29,-139],[64,-134],[102,-101],[145,-75],[180,-54],[199,-50],[210,-57],[221,-75],[217,-100],[198,-124],[171,-147],[110,-164],[96,-167],[52,-179],[29,-182],[-17,-182],[-62,-179],[-86,-170],[-148,-132],[-167,-114],[-177,-91],[-186,-62],[-175,-46],[-153,-17],[-139,7],[-133,39],[-133,51],[-136,59],[-147,65],[-169,66],[-184,67],[-221,77],[-222,101],[-225,141]]];
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

class Map {

    constructor() {
        this.data = mapData;
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

        this.map = new Map();

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