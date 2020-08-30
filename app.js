// Main app class

// Dependencies
const Express = require("express");
const WebSocket = require("ws");

// temp: map
let mapData = [[[-134,64],[-106,104],[-60,106],[-60,94],[-57,81],[-55,64],[-52,50],[-48,35],[-49,36],[-44,31],[-18,33],[-13,34],[-1,41],[12,50],[15,67],[16,84],[15,104],[10,127],[15,162],[19,171],[40,179],[60,183],[92,190],[101,181],[110,175],[124,154],[125,129],[125,91],[118,52],[107,42],[79,11],[52,1],[32,-11],[7,-17],[-28,-37],[-40,-62],[-38,-98],[-33,-114],[-5,-123],[16,-129],[33,-135],[64,-136],[76,-135],[102,-141],[117,-127],[126,-105],[131,-76],[149,-59],[161,-56],[181,-86],[184,-116],[182,-133],[173,-156],[163,-185],[148,-201],[119,-212],[79,-226],[60,-230],[28,-234],[12,-236],[-16,-242],[-36,-234],[-87,-227],[-105,-219],[-129,-212],[-149,-210],[-177,-190],[-188,-177],[-212,-151],[-220,-123],[-232,-62],[-231,-51],[-209,-3],[-203,24],[-198,44],[-196,49],[-188,73],[-185,107],[-184,116],[-182,135],[-201,171],[-208,178],[-220,191],[-221,206],[-220,217],[-218,230],[-185,238],[-163,244],[-151,241],[-149,237],[-142,227],[-137,196],[-134,179],[-133,174],[-127,162],[-118,133],[-118,128],[-115,119],[-111,107],[-105,95]],[[-69,182],[-86,194],[-92,213],[-94,232],[-89,235],[-76,240],[-61,247],[-44,247],[-34,241],[-25,232],[-19,224],[-19,212],[-25,200],[-31,190],[-42,181],[-51,183]],[[166,7],[169,32],[179,66],[195,74],[191,88],[176,119],[155,156],[163,195],[174,204],[194,202],[203,192],[209,175],[216,164],[222,141],[231,108],[230,85],[231,74],[219,55],[211,45],[218,32],[224,20],[222,8],[198,-15],[188,-15],[180,-4],[168,9],[167,11]],[]];

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

        console.log(message.points);

    }

    handleMessage(message, socket) {   
        
        message = JSON.parse(message);

        // Dispatch handler
        let handlers = {
            placeWall: this.handlePlaceWall
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