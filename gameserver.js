//
// Javascript implementation of Garrod and Anderson (1987)'s maze game
//
// NB: Install node.js, run this server in node, then point browser to localhost:8080
// Also need to install jsdom (npm install jsdom)
//

// Thingspeak key: YE9XA4NZGQUV1H2R


var http = require('http'),
  url = require('url'),
  fs = require('fs'),
  os = require("os"),
  express = require("express"),
  Thingspeak = require('thingspeakclient'),
  server, io;

function myIPv6() {

  var netint = os.networkInterfaces();
  /* Example output of os.networkInterfaces:
   * { lo0:
   *    [ { address: '::1', family: 'IPv6', internal: true },
   *      { address: '127.0.0.1', family: 'IPv4', internal: true },
   *      { address: 'fe80::1', family: 'IPv6', internal: true } ],
   *   en0:
   *    [ { address: 'fe80::cae0:ebff:fe19:1951',
   *        family: 'IPv6',
   *        internal: false },
   *      { address: '128.237.205.66', family: 'IPv4', internal: false } ],
   *   awdl0:
   *    [ { address: 'fe80::b884:77ff:fe35:faaf',
   *        family: 'IPv6',
   *        internal: false } ],
   *   utun0:
   *    [ { address: 'fe80::d116:4a3d:6c9d:c79d',
   *        family: 'IPv6',
   *        internal: false },
   *      { address: 'fdf8:f927:20f6:991:d116:4a3d:6c9d:c79d',
   *        family: 'IPv6',
   *        internal: false } ],
   *   vboxnet1:
   *    [ { address: '192.168.99.1', family: 'IPv4', internal: false } ] }
   */

  //console.log(os.networkInterfaces());
  for (var intf in netint) {
    var results = netint[intf].filter(function(details) {
      return details.family === 'IPv6' && details.internal === false;
    });
    if (results.length > 0) {
      return results[0].address;
    }
  }
  return "unknown";;
}

var thing = new Thingspeak();
thing.attachChannel(15021, {
  writeKey: 'YE9XA4NZGQUV1H2R'
});
thing.updateChannel(15021, {
  field1: myIPv6(),
  field2: 1
});

//TEMPORARY DEBUGGING MEASURE:
var logger = function(req, res, next) {
  debug(1, "REQUEST:", req.url);
  next(); // Passing the request to the next handler in the stack.
}


//END TEMPO

function boot() {

  server = express();
  server.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/gameclient.html');
  });
  server.get('/log', function(req, res) {
    res.sendFile(__dirname + '/mazeGames.log');
  });
  server.use(logger);
  server.use(express.static(__dirname + "/public"));
  socketlistener = server.listen(8080);


  Logger = function(fname) {
    this.theFile = fs.createWriteStream(fname, {
      flags: 'a'
    });
  };
  Logger.prototype.log = function(text) {
    this.theFile.write(JSON.stringify({
      when: new Date().toISOString(),
      message: text
    }) + "\n");
  }
  Logger.prototype.close = function() {
    this.theFile.end();
  }

  logger = new Logger("mazeGames.log");

  send404 = function(res, msg) {
    res.writeHead(404);
    res.write('404');
    res.write(" ");
    res.write(msg);
    res.end();
  };

  io = require('socket.io').listen(socketlistener);
  //io.set('log level', 1);

  // on a 'connection' event

  io.sockets.on('connection', function(socket) {

    console.log("Connection " + socket.id + " accepted.");

    var user = finduser(socket.id);
    user.socket = socket;

    // individual moves/messages from users receieved here
    socket.on('message', function(message) {
      user.handle(message);
    });

    socket.on('disconnect', function() {
      console.log("Connection " + socket.id + " terminated.");
      if (socket.id in users) {
        user.quit();
        delete users[socket.id];
      }
    });

  });
}
function shutdown() {
  socketlistener.close();
}

if (require.main === module) {
  boot();
}
else {
  console.info('Running app as a module')
  exports.boot = boot;
  exports.shutdown = shutdown;
  exports.port = 8080; //server.get('port');
}

function Game(uid1, uid2, boardType) {
  console.log("Starting a game with " + uid1 + " and " + uid2 + " type " + boardType);
  this.uid1 = uid1;
  this.uid2 = uid2;
  users[uid1].state = "playing";
  users[uid2].state = "playing";
  games[uid1] = this;
  games[uid2] = this;
  if (boardType == "random") {
    this.board = randBoard(); //genBoard(mapA, mapB);
  } else if (boardType in mapPairs) {
    this.board = genBoard(mapPairs[boardType][0], mapPairs[boardType][1]);
    console.log(boardPicture(this.board, "U1"));
  } else {
    this.board = randBoard();
  }
  this.inform();
}

Game.prototype.inform = function() {
  users[this.uid1].updateClient();
  users[this.uid2].updateClient();
};

Game.prototype.describe = function() {
  if (this.board.turn == 'U1') {
    var turn1 = " (turn) ";
    var turn2 = "";
  }
  if (this.board.turn == 'U2') {
    var turn2 = " (turn) ";
    var turn1 = "";
  }
  return users[this.uid1].name + turn1 + " and " + users[this.uid2].name + turn2 + " have score " + this.board.score + " with penalty " + this.board.penalty + " after " + this.board.moves + " moves " + (this.board.won ? " and won!" : "");
};

Game.prototype.boardOf = function(uid) {
  return hideOther(this.board, this.UN(uid))
}

Game.prototype.UN = function(uid) {
  if (uid == this.uid1) {
    return 'U1';
  } else {
    return 'U2';
  }
}

Game.prototype.otherUser = function(user) {
  if (user.id == this.uid1) {
    return users[this.uid2];
  } else {
    return users[this.uid1];
  }
}

Game.prototype.move = function(move, uid) {
  movePlayer(move, this.board, this.UN(uid), true);
}

Game.prototype.quit = function() {
  this.inform();
  delete games[this.uid1];
  delete games[this.uid2];
  users[this.uid1].state = "intro";
  users[this.uid2].state = "intro";
  // update scoreboard
};

function User(id) {
  this.id = id
  this.name = ""
  this.partner = ""
  this.state = "welcome"
  users[id] = this
}

User.prototype.game = function() {
  if (this.state === "playing" && this.id in games) {
    return games[this.id];
  } else {
    return undefined;
  }
}

User.prototype.updateClient = function() {
  var game = this.game();
  this.socket.emit("update", {
    "state": this.state,
    "name": this.name,
    "game": (game == undefined ? "none" : this.game().describe()),
    "peeps": peeps()
  });
  if (game != undefined && this.state == "playing") {
    this.socket.emit("gameupdate", game.boardOf(this.id));
    console.log("Just emitted animations for ", this.id, game.board.animations, "->", game.boardOf(this.id).animations);
    game.board.animations[game.UN(this.id)] = [];
  }
}

User.prototype.sendChat = function(from, txt) {
  console.log("Sending '" + txt + "' from " + from + " to " + this.name);
  this.socket.emit("chat", {
    "from": from.name,
    "text": txt
  });
}

User.prototype.handle = function(msg) {
  var parsed = msg; //JSON.parse(msg);
  console.log("Got a message: " + JSON.stringify(msg));
  logger.log({
    "msg": msg,
    "id": this.id
  }); //"gamestate" : this.game.describe()});
  if ("mynameis" in parsed && (this.state === "welcome" || this.state === "intro")) {
    this.name = parsed["mynameis"]
    this.state = "intro"
  } else if ("command" in parsed && parsed["command"] == "start" && (this.state == "intro")) {
    awaiting = waitingUsers.shift();
    if (awaiting == undefined) {
      waitingUsers.push(this.id);
      this.state = "waitpartner";
      this.updateClient();
    } else {
      if ("options" in parsed && "map" in parsed.options) {
        boardType = parsed.options.map;
      } else {
        boardType = ""
      }
      var g = new Game(awaiting, this.id, boardType);
    }
  } else if ("command" in parsed && parsed["command"] == "quit" && (this.state == "playing")) {
    var g = this.game();
    if (g != undefined) {
      g.quit();
    }
  } else if ("command" in parsed && parsed["command"] == "cancel" && (this.state == "waitpartner")) {
    this.state = "intro";
    waitingUsers = []; //waitingUsers.filter(function(elt) { return elt != this.id; });
    // TO DO: to avoid race conditions, really should go through list and remove this.id.
    //  but that filter function has a bug; deal with it later.
  } else if ("command" in parsed && ["left", "right", "up", "down", "toggle"].indexOf(parsed["command"]) > -1 && (this.state == "playing")) {
    this.game().move(parsed["command"], this.id)
    logger.log({
      result: this.game().describe(),
      board: this.game().board
    });
  } else if ("chat" in parsed && this.game() != undefined) {
    var friend = this.game().otherUser(this);
    friend.sendChat(this, parsed.chat);
  }
  updateEveryone(); //this.updateClient();
}

User.prototype.quit = function() {
  console.log("Should detatch " + this.name + " from any game in progress here")
  if (this.id in games) {
    games[this.id].quit();
  }
  this.state = "intro"
}

var users = {}; // users indexed by socket id
var waitingUsers = []; // people waiting to join a game
var games = {}; // games indexed by user's socket id.  Games are listed twice.

function peeps() {
  userlist = [];
  for (var uid in users) {
    userlist.push(users[uid].name);
  }
  return userlist;
}

function updateEveryone() {
  for (var uid in users) {
    users[uid].updateClient();
  }
}

function finduser(id) {
  if (id in users) {
    return users[id];
  } else {
    return new User(id)
  }
}
/*

O     O
|     |
O-O-O O-O
  | | |
  O-O-O-O
  | |   |
  O-O-O O-O
  |   | |
O-O-O-O-O
    |
    O-O-O


    A:
User = 1
Goal = 2
Switch = 4
Barrier = +

*/

mapIIaA =
    ['1-0-0-4',
     '+ + + +',
     '0-0-4-0',
     '+ + + +',
     '0-4-0-0',
     '+ + + +',
     '4-0-0-2']
mapIIaB =
    ['4-0-0-1',
     '+ + + +',
     '0-4-0-0',
     '+ + + +',
     '0-0-4-0',
     '+ + + +',
     '2-0-0-4']

mapIIbA =
    ['0+0+4-4+0+0',
     '|   + +   |',
     '4-0+5 4+0-4',
     '  + | | +  ',
     '4+4-0-0-4+4',
     '| + + + | +',
     '0-0-4 4-0-0',
     '  + | | +  ',
     '0-4+0+0+4-0',
     '| +     + |',
     '0-2+4-4+0-0']
mapIIbB =
    ['0+4-0-0-4+0',
     '|   + +   |',
     '4+0-4 5-0+4',
     '  + | | +  ',
     '0+4-0-0-4+0',
     '+ | + + | +',
     '4-0+4 4+0-4',
     '  + | | +  ',
     '0-4-4+4-4-0',
     '| +     + |',
     '0+0-0-0-2+0']
//p595
mapIIcA =
    ['0-4+1-0+4-0',
     '+   | |   +',
     '0-0+4 4+0-0',
     '| +     + |',
     '4+0+4-4+0+4',
     '  | | | |  ',
     '0-4+0+0+4-0',
     '+   + +   +',
     '4+2-4+4-0+4',
     '  + | | +  ',
     '0-0-0+0-0-0']
mapIIcB =
    ['0-0+4+6+0-0',
     '+   + +   +',
     '0+4-0 0-4+0',
     '| |     | |',
     '4-0+4+4+0-4',
     '  + | | +  ',
     '4+0-0+0-0+4',
     '|   + +   |',
     '0+4+0-0+5+0',
     '  | | | |  ',
     '0-0-4+4-0-0']

mapIIdA =
    ['0+4-1+8-4+0',
     '| + | | + |',
     '4+0-4 4-0+4',
     '  | + + |  ',
     '0-4+0-0+4-0',
     '+ +     + +',
     '4-0-4+4-0-4',
     '+ + + + + +',
     '0 6+0-0+4 0',
     '| | | | | |',
     '0-0-4 4-0-0']
mapIIdB =
    ['0+0-4+d-0+0',
     '| | + + | |',
     '4-4+0 0+4-4',
     '  | | | |  ',
     '4-0+4+4+0-4',
     '+ +     + +',
     '0-4+0-0+4-0',
     '+ + | | + +',
     '0 0-4-4-2 0',
     '| | + + | |',
     '0-4+0 0+4-0']

mapIIeA =
    ['0     0    ',
     '|     |    ',
     '0+5+0 0-0  ',
     '  | | +    ',
     '  0-4+4-4  ',
     '  + +   |  ',
     '  4-0+0 0-2',
     '  +   | |  ',
     '0+4-0+4-0  ',
     '    +      ',
     '    4-0-0  ']
mapIIeB =
    ['0     0    ',
     '|     |    ',
     '0-0+4 2-0  ',
     '  + | |    ',
     '  4-0+0+4  ',
     '  + +   +  ',
     '  0+4-4 4-0',
     '  |   + |  ',
     '0-4+1-0+0  ',
     '    +      ',
     '    4-0-0  ']

mapIIfA =
    ['0-4 1-0 4-0',
     '+ | | | | +',
     '0-0+4 4+0-0',
     '| + + + + |',
     '4 0+4-4+0 4',
     '+ | | | | +',
     '0+4 0+0 4+0',
     '+ | + + | +',
     '4+2-4 4-0+4',
     '| + | | + |',
     '0 0-0+0-0 0']
mapIIfB =
    ['0-0 4+5 0-0',
     '+ | + + | +',
     '0+4-0 0-4+0',
     '| | + + | |',
     '4 0+4+4+0 4',
     '+ + | | + +',
     '4+0 0+0 0+4',
     '| | + + | |',
     '0+4+0 0+6+0',
     '| | | | | |',
     '0 0-4+4-0 0']





mapA =
    ['0+0-4+4-0+0',
     '|   + +   |',
     '0+4-0-1-4+0',
     '| + | | + |',
     '4+0+4-4+0+4',
     '  | + + |  ',
     '0-4+0-0+4-0',
     '+   | |   +',
     '4-0+4-6+0-4',
     '| | + + | |',
     '0+4-0+0-4+0'];

mapB =
    ['0-0+4-4+0-0',
     '+   + +   +',
     '4-0+5+4+0-4',
     '| | | | | |',
     '0+4-0-0-4+0',
     '  + + + +  ',
     '4-0-4+4-0-4',
     '+   + +   +',
     '0+4+2-0+4+0',
     '| | | | | |',
     '0-0+4-4+0-0'];

mapC=
    ['0     0    ',
     '|     |    ',
     '0-0-0 0-0  ',
     '  | | |    ',
     '  0-0-0-0  ',
     '  | |   |  ',
     '  0-0-0 0-0',
     '  |   | |  ',
     '0-0-0-0-0  ',
     '    |      ',
     '    0-0-0  '];
mapD=
    ['0     0    ',
     '|     |    ',
     '0-0-0 0-0  ',
     '  | | |    ',
     '  0-0-0-0  ',
     '  | |   |  ',
     '  0-0-0 0-0',
     '  |   | |  ',
     '0-0-0-0-0  ',
     '    |      ',
     '    0-0-0  '];

StupidA=
    ['1-2',
     '| |',
     '0-0']
StupidB=
   ['2-1',
    '| |',
    '0-0']

mapPairs = {
  IIa: [mapIIaA, mapIIaB],
  IIb: [mapIIbA, mapIIbB],
  IIc: [mapIIcA, mapIIcB],
  IId: [mapIIdA, mapIIdB],
  IIe: [mapIIeA, mapIIeB],
  IIf: [mapIIfA, mapIIfB],
  AB: [mapA,mapB],
  CD: [mapC,mapD],
  Stupid: [ StupidA, StupidB ]
}
console.log("IIc Both:", mapPairs["IIc"])

/* Generating more mazes:
   o Is-connected function: are there disconnected rooms?
   o Random-dir: N/S/E or W
   o ExtendRoom: Given a room and a direction, extend it
   o Reflect: Make a maze symmetrical H, V, or both by adding rooms/halls

   o Start with a 6x6 space
   o Decide if symmetrical (H, V, or both)
   o Choose one room on each of the four sides
   o Choose R1 more rooms
   o Extend all four rooms as snakes, each moving one step at a time,
	until all rooms are connected
     o At each step, reflect appropriately
   o Randomly assign door valence for each opponent
     o If symmetrical, just do for half/quarter the maze and reflect
   o Assign goals and starting point
*/

/* Other things to do:
   o Add a monster.
   o Add up "points": Count of mazes accomplished; number of steps needed
   o Omniscient solver: move both pawns to the exits
*/

var debuglevel = 0;
function debug(level, text) {
    if (level < debuglevel) {
        console.log(text);
    }
}

function emptyBoard(width, height) {
    var cells = [];
    for(var y=0; y<height; y++) {
        cells[y] = [];
        for(var x=0; x<width; x++) {
            cells[y][x] = {};
            cells[y][x]["room"] = ' ';
        }
    }
    return { "score": 0,
             "penalty": 0,
             "moves": 0,
             "won" : false,
             "size_x": width,
             "size_y": height,
             "turn" : 'U1',
             "cells": cells,
             "animations": {'U1':[], 'U2':[]} };

}

function randBoard() {
    var room_width = 6;
    var room_height = 6;
    var board = emptyBoard(room_width*2-1, room_height*2-1);

    var randEvenCol = function() { return Math.floor(Math.random()*room_width)*2; }

    // Choose a random location along each wall (to make sure the
    //  final maze encompases the full NxN space
    // Note that these might neighbor or even overlap. Doesn't matter.
    var locBot = [randEvenCol(), room_height*2-2]
    var locLeft = [0, randEvenCol()]
    var locTop = [randEvenCol(), 0]
    var locRight = [room_width*2-2, randEvenCol()]

    debug(3, "Starting with " + locBot + " " + locLeft + " " + locTop + " " + locRight);
    makeroom(board, locBot);
    makeroom(board, locLeft);
    makeroom(board, locTop);
    makeroom(board, locRight);

    for(i=0; i<10; i++) {
        makeroom(board, [randEvenCol(),randEvenCol()]);
    }

    // While not connected, pick a room at random and add a neighboring room
    do {
        randroom = randomRoom(board);
        neigh = potentialNeighbors(board, randroom);
        neigh1 = neigh[Math.floor(Math.random()*neigh.length)];
        makeroom(board, neigh1[0]);
        addHallway(board, randroom, neigh1[0]);
    } while (!isConnected(board));

    for(var x=0; x<room_width*2-1; x++) {
        for(var y=0; y<room_height*2-1; y++) {
            rollU1 = Math.random();
            rollU2 = Math.random();
            debug(3, "Adding stuff at %s probabilities %s, %s", [x,y], rollU1, rollU2);
            if (iscorridor(board,[x,y])) {
                if (rollU1 < .2) {
                    insert(board, [x,y], "U1", "barrier");
                    debug(3, "corridor U1")
                }
                if (rollU2 < .2) {
                    insert(board, [x,y], "U2", "barrier");
                    debug(3, "corridor U2")
                }
            }
            if (isroom(board, [x,y])) {
                if (rollU1 < .3) {
                    insert(board, [x,y], "U1", "switch");
                    debug(3, "switch U1")
                }
                if (rollU2 < .3) {
                    insert(board, [x,y], "U2", "switch");
                    debug(3, "switch U21")
                }
            }
        }
    }


    insert(board, randomRoom(board), "U1", "me");
    insert(board, randomRoom(board), "U2", "me");
    insert(board, randomRoom(board), "U1", "goal");
    insert(board, randomRoom(board), "U2", "goal");

    return board;
}

function genBoard(mapA, mapB) {
    console.log(mapA, mapB);
    var cells = []
    var maxx = mapA[0].length;
    var maxy = mapA.length;
    for(y=0; y<maxy; y++) {
        row = mapA[y];
        cells[y] = [];
        for(x = 0; x<row.length; x++) {
            console.log(y,x,row, row.length);
            var cell = {};
            switch (row.charAt(x)) {
                case '1': cell["room"] = '0'; cell['U1'] = {"contents" : ["me"]}; break;
                case '2': cell["room"] = '0'; cell['U1'] = {"contents" : ["goal"]}; break;
                case '3': cell["room"] = '0'; cell['U1'] = {"contents" : ["me", "goal"]}; break;
                case '4': cell["room"] = '0'; cell['U1'] = {"contents" : ["switch"]}; break;
                case '5': cell["room"] = '0'; cell['U1'] = {"contents" : ["me", "switch"]}; break;
                case '6': cell["room"] = '0'; cell['U1'] = {"contents" : ["goal", "switch"]}; break;
                case '7': cell["room"] = '0'; cell['U1'] = {"contents" : ["me", "switch", "goal"]}; break;
                case '+': if (x % 2 == 1) {  // cells with odd x must be horizontal corridors
                            cell["room"] = '-'; cell['U1'] = {"contents" : ["barrier"]};
                          } else {           // cells with odd y must be vertical corridors
                            cell["room"] = '|'; cell['U1'] = {"contents" : ["barrier"]};
                          }
                          break;
                default: cell["room"] = row.charAt(x);
            }
            cells[y][x] = cell;
        }
    }
    // Now read the other one
    for(y=0; y<maxy; y++) {
        row = mapB[y];
        for(x = 0; x<row.length; x++) {
             switch (row.charAt(x)) {
                case '1': cells[y][x]['U2'] = {"contents" : ["me"]}; break;
                case '2': cells[y][x]['U2'] = {"contents" : ["goal"]}; break;
                case '3': cells[y][x]['U2'] = {"contents" : ["me", "goal"]}; break;
                case '4': cells[y][x]['U2'] = {"contents" : ["switch"]}; break;
                case '5': cells[y][x]['U2'] = {"contents" : ["me", "switch"]}; break;
                case '6': cells[y][x]['U2'] = {"contents" : ["goal", "switch"]}; break;
                case '7': cells[y][x]['U2'] = {"contents" : ["me", "switch", "goal"]}; break;
                case '+': cells[y][x]['U2'] = {"contents" : ["barrier"]}; break;
            }
        }
    }
    return { "score": 0,
             "penalty": 0,
             "won" : false,
             "size_x": maxx,
             "size_y": maxy,
             "turn" : 'U1',
             "moves": 0,
             "cells": cells,
             "animations": {'U1':[], 'U2':[]} };
}

Array.prototype.remove_item = function (item) {
    var index = this.indexOf(item)
    if (index != -1) { this.splice(index,1); }
    else { console.log("Didn't really find " + item + " in " + this); }
}



function movePlayer(direction, board, player, turnsMatter) {
    board.animations = {'U1':[], 'U2':[]};
    if (board.turn != player && turnsMatter) {
        console.log("Not your turn, " + player + "!");
        return;
    }
    var loc = findThing(board, player, "me")
    var other = otherPlayer(player)
    var newloc = [-1,-1]
    switch (direction) {
        case "up": if (loc[0] > 1) { newloc = [loc[0]-2, loc[1]]; } break;
        case "down": if (loc[0] < board.size_x-1) { newloc = [+loc[0]+2, loc[1]]; } break;
        case "left": if (loc[1] > 1) { newloc = [loc[0], loc[1]-2]; } break;
        case "right": if (loc[1] < board.size_y-1) { newloc = [loc[0], +loc[1]+2]; } break;
        case "toggle": newloc = loc; break;
    }
    //console.log("Trying to move " + player + " from " + loc + " to " + newloc);

    if (newloc[0] > -1 && newloc != loc) {
        var passageCoords = [(+loc[0]+newloc[0])/2,(+loc[1]+newloc[1])/2]
        //console.log("Passage coordinates are " + passageCoords)
        var hallway = iscorridor(board, passageCoords);
        var barrier = checkif(board, passageCoords, player, "barrier");
        if (hallway && !barrier) {
            board.animations[player].push("move_" + direction);
            board.turn = other;
            board.moves++;

        } else if (hallway && barrier) {
            board.turn = other;
            board.animations[player].push("bouncehard_" + direction);
            board.moves++;
            board.penalty+=2;
            newloc[0] = -1;
        } else if (!hallway) {
            newloc[0] = -1;
            board.animations[player].push("bounce_" + direction);
            //console.log("Blocked passage");
        }
    }

    if (newloc[0] > -1) {
        remove(board, loc, player, "me")
        //console.log("..." + player + " in " + JSON.stringify(board.cells[newloc[0]][newloc[1]]) + " = " +
        //           (player in board.cells[newloc[0]][newloc[1]]))
        insert(board, newloc, player, "me")
        var goal = checkif(board, newloc, player, "goal");
        if (goal) {
            remove(board, newloc, player, "goal");
            console.log("Win check:",player, findThing(board,player,"goal"),other,findThing(board,other,"goal"));
            if (findThing(board, other, "goal") == -1) {
              board.won = true;
              board.score = 100;
              board.animations[other].push("won");
              board.animations[player].push("won");
            } else {
              board.animations[player].push("gotgoal");
            }
        }
        console.log("Checking switch for " + other + " instead of " + player + ": " + checkif(board, newloc, other, "switch"))
        if (checkif(board, newloc, other, "switch")) {
            console.log("...yep!  Flipping barriers")
            board.animations[other].push("doornoise");
            flipBarriers(board, other)
        }
        board.turn = other;
    }
}

function insert(board, loc, player, item) {
    if (!(player in board.cells[loc[0]][loc[1]])) {
        board.cells[loc[0]][loc[1]][player] = {"contents":[item]};
    } else {
        console.log(board.cells[loc[0]][loc[1]]);
        board.cells[loc[0]][loc[1]][player]["contents"].push(item);
    }
}

function remove(board, loc, player, item) {
    if (checkif(board, loc, player, item)) {
        board.cells[loc[0]][loc[1]][player]["contents"].remove_item(item);
    }
}

function checkif(board, loc, player, item) {
    debug(5, "checkif(board," + loc + "," + player + "," + item + ")");
    return (player in board.cells[loc[0]][loc[1]] && board.cells[loc[0]][loc[1]][player]["contents"].indexOf(item) > -1);
}
function checkroom(board, loc, item) {
    console.log("checkroom(board," + loc + "," + item + ")");
    return ("room" in board.cells[loc[0]][loc[1]] && board.cells[loc[0]][loc[1]].room.indexOf(item) > -1);
}
function iscorridor(board, loc) {
    return (checkroom(board, loc, '|') || checkroom(board, loc, '-'));
}
function makeCorridor(board, loc) {
    if (loc[0] % 2 == 0) {
        board.cells[loc[0]][loc[1]]["room"] = "-";
    } else {
        board.cells[loc[0]][loc[1]]["room"] = "|";
    }
}
function makeroom(board, loc) {
    if (!isroom(board, loc)) {
        board.cells[loc[0]][loc[1]]["room"] = '0';
    }
}
function areNeighboring(loc1, loc2) {
    if (loc1[0]==loc2[0] && (loc1[1]==loc2[1]+2 || loc1[1]==loc2[1]-2)) {
        return true;
    }
    if (loc2[0]==loc1[0] && (loc2[1]==loc1[1]+2 || loc2[1]==loc1[1]-2)) {
        return true;
    }
    return false;
}
function addHallway(board, loc1, loc2) {
    if (!(isroom(board, loc1) && isroom(board, loc2))) {
        assert("Bad call to addHallway " + loc1 + loc2);
    }
    if (!(Math.abs(loc1[0]-loc2[0])+Math.abs(loc1[1]-loc2[1])==2)) {
        assert("Bad call to addHallway " + loc1 + loc2);
    }
    hallLoc = [(loc1[0]+loc2[0])/2, (loc1[1]+loc2[1])/2]
    makeCorridor(board, hallLoc);
}
function isroom(board, loc) {
    debug(5,"isroom(board, " + loc + ")" );
    return (("room" in board.cells[loc[0]][loc[1]]) && board.cells[loc[0]][loc[1]]["room"] == '0');
}
function dump(board, loc) {
    return JSON.stringify(board.cells[loc[0]][loc[1]])
}

function potentialNeighbors(board, loc) {
    // Returns list of (room loc, corridor loc) but no guarantee
    // that those places exist; just that they're not off the edge of
    // the map.
   var neigh = [];
   if (loc[0] > 0) {
       neigh.push([    [loc[0]-2, loc[1]], [loc[0]-1, loc[1]]   ]);
   }
   if (loc[1] > 0) {
       neigh.push([    [loc[0], loc[1]-2], [loc[0], loc[1]-1]   ]);
   }
   if (loc[0] < board.size_x-1) {
       neigh.push([   [loc[0]+2, loc[1]], [loc[0]+1, loc[1]]  ]);
   }
   if (loc[1] < board.size_y-1) {
       neigh.push([   [loc[0], loc[1]+2], [loc[0], loc[1]+1]   ]);
   }
   debug(5,"potentialNeighbors returns " + neigh + " whose length is " + neigh.length);
   return neigh;
}

function neighbors(board, loc) {
   // return a list of neighboring rooms (ignoring barriers and player)
    var neigh = [];
    var pn = potentialNeighbors(board, loc)
    for (n=0; n<pn.length; n++) {
        debug(5,"Checking potential neighbor " + n + " which is " + pn[n]);
        if (iscorridor(board, pn[n][1])) {
            neigh.push(pn[n]);
        }
    }
    return neigh;
}

function randomRoom(board) {
    do {
        var loc = [Math.floor(Math.random()*board.size_x), Math.floor(Math.random()*board.size_y)]
    } while (!isroom(board, loc));
    return loc;
}


function floodfill(board, fromloc, player, marker, d) {
    if (checkif(board, fromloc, player, marker)) {
        return;
    }
    insert(board, fromloc, player, marker);
    var neigh = neighbors(board, fromloc);
    debug(6, boardPictureMarker(board, player, marker));
    for (var n =0; n<neigh.length; n++) {
        floodfill(board, neigh[n][0], "U1", "marker", d+1);
    }
    debug(6, boardPictureMarker(board, player, marker));
}

function isConnected(board) {
    start = randomRoom(board);
    scratch = copyBoard(board);
    floodfill(scratch, start, "U1", "marker", 0);
    missing = findLackOfThing(scratch, "U1", "marker");
    return (missing[0] == -1 && missing[1] == -1);
}

function flipBarriers(board, player) {
   for (var x=0; x<board.cells.length; x++) {
       for (var y=0; y<board.cells[x].length; y++) {
           var loc = [x,y]
           //console.log("For " + loc + " cell has " + dump(board, loc))
           if (checkif(board,loc,player,"barrier")) {
               //console.log("...removing barrier");
               remove(board,loc,player,"barrier");
           } else {
               //console.log("...adding barrier");
                insert(board,loc,player,"barrier");
           }
           //console.log("  --> and so now " + dump(board, loc));
        }
   }
}

function otherPlayer(player) {
    if (player == "U1") { return "U2"; }
    else { return "U1"; }
}

function findThing(board, player, thing) {
   for (var x=0; x<board.cells.length; x++) {
       for (var y=0; y<board.cells[x].length; y++) {
           if (checkif(board, [x,y], player, thing)) {
               return [parseInt(x), parseInt(y)];
            }
        }
    }
    return (-1,-1);
}

function findLackOfThing(board, player, thing) {
   for (var x=0; x<board.cells.length; x++) {
       for (var y=0; y<board.cells[x].length; y++) {
           if (isroom(board, [x,y]) && !checkif(board, [x,y], player, thing)) {
               return [parseInt(x), parseInt(y)];
            }
        }
    }
    return [-1,-1];
}

function copyBoard(board) {
    return JSON.parse(JSON.stringify(board));
}

function hideOther(board, me) {
    boardA = copyBoard(board);
    var other = otherPlayer(me)
    boardA.myturn = (boardA.turn == me);
    for (x=0; x<boardA.cells.length; x++) {
        for (y=0; y<boardA.cells[x].length; y++) {
            if (other in boardA.cells[x][y]) {
                delete boardA.cells[x][y][other];
            }
            if (me in boardA.cells[x][y]) {
                boardA.cells[x][y]["contents"] = boardA.cells[x][y][me]["contents"]
                delete boardA.cells[x][y][me]
            }
        }
    }
    boardA.animations = boardA.animations[me];
    return boardA;
}

function contents2digit(cell) {
    var d = cell["room"];
    if ('contents' in cell) {
        var k = 0;
        if (cell['contents'].indexOf('me') > -1) { k = k + 1; }
        if (cell['contents'].indexOf('goal') > -1) { k = k + 2; }
        if (cell['contents'].indexOf('switch') > -1) { k = k + 4; }
        if (k > 0) { d = k; }
        if (cell['contents'].indexOf('barrier') > -1) { d = '+'; }
    }
    return d;
}

function boardPicture(board, me) {
    var pix = ""
    var b1 = hideOther(board, me)
    for (var x=0; x<b1.cells.length; x++) {
        for (var y=0; y<b1.cells[x].length; y++) {
            pix = pix + contents2digit(b1.cells[x][y]);
        }
        pix = pix + "\n";
    }
    return pix;
}

function boardPictureMarker(board, me, item) {
    var pix = ""
    for (var x=0; x<board.cells.length; x++) {
        for (var y=0; y<board.cells[x].length; y++) {
            if ("room" in board.cells[x][y]) {
                if (checkif(board, [x,y], me, item)) {
                    pix = pix + "@";
                } else {
                    pix = pix + board.cells[x][y]["room"];
                }
            } else {
                pix = pix + " "
            }
        }
        pix = pix + "\n";
    }
    return pix;
}

/*gb = genBoard(mapA, mapB);
console.log("Connection check: " + isConnected(gb));
rb = randBoard();
console.log(boardPicture(rb, "U1"));
console.log(boardPicture(rb, "U2"));*/
