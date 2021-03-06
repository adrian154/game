// Dependencies
const Express = require("express");
const WebSocket = require("ws");
const Util = require("./util.js");
const map = require("./map.json");

const SOLDIER_BASE_SPEED = 5;
const SOLDIER_NAV_COSTS = {
    [Util.Tiles.WATER]: 5,
    [Util.Tiles.GRASS]: 1
};

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

class GameObject {

    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
    }

    update() {
        
        this.nextX = this.x + this.dx * Util.TIMESTEP;    
        this.nextY = this.y + this.dy * Util.TIMESTEP;

    }

    toJSON() {
        return {x: this.x, y: this.y, type: this.type};
    }

}

class DynamicObject extends GameObject {

    constructor(x, y, radius, baseSpeed, navCosts) {
        super(x, y, radius);
        this.baseSpeed = baseSpeed;
        this.navCosts = navCosts;
    }

    update() {

        if(this.navgrid) {

            let tileX = Math.floor(this.x + this.navgrid.vectors.length / 2);
            let tileY = Math.floor(this.y + this.navgrid.vectors[tileX].length / 2);
            let vector = this.navgrid.vectors[tileX][tileY];

            if(vector) {

                let speed = this.baseSpeed;
                let cost = this.navCosts(map[tileX][tileY]);
                let sqDistToTarget = (this.x - this.navgrid.targetX) * (this.x - this.navgrid.targetX) + (this.y - this.navgrid.targetY) * (this.y - this.navgrid.targetY);

                if(!navgrid.cluster && sqDistToTarget < 16) {
                    speed = Math.max(sqDistToTarget - 12, 0);    
                }

                speed /= cost;

                this.dx = vector[0] * speed;
                this.dy = vector[1] * speed;

            }

        }

        super.update();

    }

    static calcPathfindingGrid(x, y, cluster) {
        return this.world.calculateNavGrid(x, y, this.navCosts, cluster);
    }

}

class Soldier extends DynamicObject {

    constructor(x, y) {
        super(x, y, 0.5, SOLDIER_BASE_SPEED, SOLDIER_NAV_COSTS);
        this.type = "Soldier";
    }

    update() {
     
        // Maybe attacking?

        super.update();

    }

}

class Unit {

    constructor(type, objectIDs) {
        this.type = type;
        this.objects = objectIDs;
    }

}

class World {

    constructor(data, game) {

        // Set up map data
        this.data = data;
        this.width = data.length;
        this.height = data[0].length;

        // Attach dependencies
        this.game = game;

        // Clear objects
        this.objects = {
            Soldier: {}
        };

        this.objectsFlat = {};
        this.nextObjectID = 0;

        // Start update tick
        setInterval(() => this.update(), 50);
    
    }

    getNextObjectID() {
        this.nextObjectID++;
        return this.nextObjectID;
    }

    // It's assumed that the map is rectangular
    // Check if indices are inside map
    containsIndex(x, y) {
        return x >= 0 &&  y >= 0 && x < this.data.length && y < this.data[0].length;
    }

    // Check if world point is inside map
    containsPoint(x, y) {
        return x > -this.width / 2 && y > -this.height / 2 && x < this.width / 2 && y < this.height / 2;
    }

    addObject(object) {
        let id = this.getNextObjectID();
        this.objects[object.type][id] = object;
        this.objectsFlat[id] = object;
        this.broadcastObjectCreation(id, object);
        return id;
    }

    removeObjectLocal(id) {
    
        delete this.objectsFlat[id];
    
        for(let type of Object.values(this.objects)) {
            delete this.objects[type][id];
        }
    
    }

    // Add an object based on a message payload
    handlePlaceUnit(message, player) {
        
        let objectIDs = [];

        if(message.unitType === "LightInfantry") {
        
            // Add tons of soldiers
            for(let i = 0; i < 10; i++) {
                let angle = Math.random() * 2 * Math.PI;
                let dist = Math.random()  * 5;
                let soldier = new Soldier(this, message.x + Math.cos(angle) * dist, message.y + Math.sin(angle) * dist, this.navgrid, player);
                objectIDs.push(this.addObject(soldier));
                this.addObject(soldier);
            }
        
        }

        let unit = new Unit(message.unitType, objectIDs);
        return unit;

    }

    handleSetTarget(message, socket) {
        this.navgrid = this.calculateNavGrid(message.x, message.y);
    }

    broadcastObjectCreation(id, object) {

        let text = JSON.stringify({
            type: "addObject",
            id: id,
            object: object
        });

        for(let player of this.game.players) {
            player.socket.send(text);
        }

    }

    broadcastObjectUpdates() {

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

        let startTime = Date.now();

        // Loop through objects, update
        for(let type of Object.keys(this.objects)) {
            for(let id of Object.keys(this.objects[type])) {
                this.objects[type][id].update();
            }
        }

        let endTime = Date.now();
        //console.log("Took " + (endTime - startTime) + " ms");

        this.broadcastObjectUpdates();

    }

    static getNavCost(tileType) {
        return ({
            [Util.Tiles.WATER]: 10, // placeholder
            [Util.Tiles.GRASS]: 1 
        })[tileType];
    }

    static calculateVectors(delta) {

        let vectors = Util.make2DArray(delta * 2 + 1, delta * 2 + 1);
        
        for(let x = -delta; x <= delta; x++) {
            for(let y = -delta; y <= delta; y++) {
                
                if(x == 0 && y == 0) continue;
                
                let length = Math.sqrt(x * x + y * y);
                vectors[x + delta][y + delta] = [
                    x / length,
                    y / length
                ];

            }
        }

        return vectors;

    }

    static calculateVectorCoefficients(vectors, delta) {

        let coefficients = Util.make2DArray(delta * 2 + 1, delta * 2 + 1);

        for(let targetDx = -delta; targetDx <= delta; targetDx++) {
            for(let targetDy = -delta; targetDy <= delta; targetDy++) {

                if(targetDx == 0 && targetDy == 0) continue;
                
                let vector = vectors[targetDx + delta][targetDy + delta];
                let points = [
                    [0, 0],
                    [targetDx, targetDy]
                ];

                // Horizontals
                for(let y = 0.5 * Math.sign(vector[1]); vector[1] < 0 ? y > targetDy : y < targetDy; y += Math.sign(vector[1])) {
                    points.push([
                        y * targetDx / targetDy,
                        y
                    ]);
                }

                // Verticals
                // Only if the vector isn't perfectly diagonal will the verticals be evaluated.
                // This is an arbitrary decision to avoid situations where a diagonal vector will have double the number of points it should have.
                if(Math.abs(vector[1] - vector[0]) > 0.001) {
                    for(let x = 0.5 * Math.sign(vector[0]); vector[0] < 0 ? x > targetDx : x < targetDx; x += Math.sign(vector[0])) {
                        points.push([
                            x,
                            x * targetDy / targetDx
                        ]);
                    }
                }
                
                // Sort points
                // The direction doesn't really matter as long as they are sorted
                if(Math.abs(vector[1]) > Math.abs(vector[0])) {

                    // Slope > 1: Sort by y-axis
                    points.sort((a, b) => a[1] - b[1]);

                } else {

                    // Sort by x
                    points.sort((a, b) => a[0] - b[0]);

                }

                // Determine coefficients
                let coeffs = [];
                for(let i = 0; i < points.length - 1; i++) {

                    let first = points[i];
                    let next = points[i + 1];

                    let dx = next[0] - first[0];
                    let dy = next[1] - first[1];
                    let cx = first[0] + dx / 2;
                    let cy = first[1] + dy / 2;
                    let length = Math.sqrt(dx * dx + dy * dy);

                    coeffs.push({
                        x: Math.floor(cx + 0.5),
                        y: Math.floor(cy + 0.5),
                        amount: length
                    });

                }

                coefficients[targetDx + delta][targetDy + delta] = coeffs;
            
            }

        }

        return coefficients;

    }

    calculateCostGrid(x, y, navCosts) {
        
        let costGrid = Util.make2DArray(this.width, this.height);
        let frontier = [[x, y]];
        costGrid[x][y] = 0;

        while(frontier.length > 0) {

            let numAdded = 0;
            while(frontier.length > numAdded) {

                let elem = frontier.pop();
                let x = elem[0];
                let y = elem[1];
                let curCost = costGrid[x][y];
                let curNavCost = navCosts[this.data[x][y]];

                for(let dx = -1; dx <= 1; dx++) {
                    for(let dy = -1; dy <= 1; dy++) {

                        if(!(dx == 0 ^ dy == 0)) {
                            continue;
                        }

                        let nextX = x + dx;
                        let nextY = y + dy;
                        
                        if(this.containsIndex(nextX, nextY)) {
                            let nextNavCost = navCosts[this.data[nextX][nextY]];
                            if(costGrid[nextX][nextY] === undefined && nextNavCost >= curNavCost) {
                                frontier.unshift([nextX, nextY]);
                                costGrid[nextX][nextY] = curCost + nextNavCost;
                                numAdded++;
                            }

                        }

                    }

                }

            }

        }

        return costGrid;

    }

    calculateVectorGrid(vectors, coefficients, costGrid, delta) {

        let vectorGrid = Util.make2DArray(this.width, this.height);

        for(let x = 0; x < vectorGrid.length; x++) {
            for(let y = 0; y < vectorGrid[x].length; y++) {

                // Find vector with minimal cost
                let minDx, minDy, minCost = Infinity;
                for(let dx = -delta; dx <= delta; dx++) {
                    for(let dy = -delta; dy <= delta; dy++) {

                        if(dx == 0 && dy == 0) continue;

                        let coeffs = coefficients[dx + delta][dy + delta];
                        let cost = 0, totAmount = 0;
                        for(let elem of coeffs) {
                            if(this.containsIndex(x + elem.x, y + elem.y)) {
                                cost += costGrid[x + elem.x][y + elem.y] * elem.amount;
                                totAmount += elem.amount;
                            }
                        }

                        cost /= totAmount;
                        if(cost < minCost) {
                            minDx = dx;
                            minDy = dy;
                            minCost = cost;
                        }

                    }
                }

                if(minDx !== undefined && minDy !== undefined) {
                    vectorGrid[x][y] = vectors[minDx + delta][minDy + delta];
                }

            }
        }

        return vectorGrid;

    }

    calculateNavGrid(x, y, navCosts, cluster) {

        if(!this.containsPoint(x, y)) {
            throw new Error("Can't calculate navgrid to point outside of map.");
        }

        // Convert to world coordinates
        let cx = Math.floor(x + this.width / 2);
        let cy = Math.floor(y + this.height / 2);

        const resolution = 5;

        let vectors = World.calculateVectors(resolution);
        let coefficients = World.calculateVectorCoefficients(vectors, resolution);
        let costGrid = this.calculateCostGrid(cx, cy, navCosts);
        let vectorGrid = this.calculateVectorGrid(vectors, coefficients, costGrid, resolution);

        return {
            targetX: x,
            targetY: y,
            cluster: cluster,
            vectors: vectorGrid
        };

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
            units: {},
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

    addUnit(player, unit) {
    
        let id = this.map.getNextObjectID();
        player.units[id] = unit;

        player.socket.send(JSON.stringify({
            type: "addUnit",
            unit: unit,
            id: id
        }));

        return id;

    }

    destroyObject(id) {
        // TODO
    }

    destroyUnit(player, id) {
        // TODO
    }

    handleMessage(message, socket) {
        
        message = JSON.parse(message);

        // Dispatch handler
        let handlers = {
            joinGame: message => this.handleJoinGame(message, socket),
            placeUnit: message => this.handlePlaceUnit(message, socket),
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

    handlePlaceUnit(message, socket) {
        let unit = this.map.handlePlaceUnit(message, socket.player);
        this.addUnit(socket.player, unit);
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

        if(socket.player) {
            
            this.broadcastChatMessage(`Player ${socket.player.name} left the game`);
            
            // Destroy units
            for(let unit of Object.values(socket.player.units)) {
                for(let objectID of unit.objects) {

                    // Delete from world
                    
                    // Destroy

                }
            }

        }

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