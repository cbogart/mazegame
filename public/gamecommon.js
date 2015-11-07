
(function(exports){

    // Pattern from http://caolanmcmahon.com/posts/writing_for_node_and_the_browser/
    // allowing functions to be used in both browser and node.js

   exports.test = function(){
        return 'hello world'
    };
   exports.commonTest = function () { return 42; }

   exports.sounds = {
     "doorhit": new Audio("/sounds/Boing.ogg"),
     "dooropen": new Audio("/sounds/door_open.ogg"),
     "wallhit": new Audio("/sounds/Boing.ogg")
   };
   exports.drawGame = function (board, svg) {
        var scale = 30;
        var leng = 2.2;
        for (a in board.animations) {
          console.log("Making noise for ", board.animations[a]);
          if (board.animations[a].slice(0,10) == "bouncehard") {
            exports.sounds.doorhit.play();
          } else if (board.animations[a].slice(0,6) == "bounce") {
            exports.sounds.wallhit.play();
          } else if (board.animations[a].slice(0,9) == "doornoise") {
            exports.sounds.dooropen.play();
          }
        }
        board.animations = [];
        svg.setAttribute('width', board["size_x"]*scale);
        svg.setAttribute('height', board["size_y"]*scale);
        svg.setAttribute('xmlns:xlink', "http://www.w3.org/1999/xlink");
        for (x1=0; x1<board["size_x"]*2; x1+= 2) {
            for (y1=0; y1<board["size_y"]*2; y1+= 2) {
                var x = x1<=board["size_x"]?x1:x1-board["size_x"]
                var y = y1<=board["size_y"]?y1:y1-board["size_y"]
                cell = board.cells[y][x];
                contents = [];
                if ('contents' in cell) {
                    contents = cell['contents'];
                }
                if (cell['room'] == "0") {
                    var shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    shape.setAttribute('x', x*scale);
                    shape.setAttribute('y', y*scale);
                    shape.setAttribute('width', scale);
                    shape.setAttribute('height', scale);
                    shape.setAttribute('stroke',  "black");
                    shape.setAttribute('fill',  "white");
                    svg.appendChild(shape);
                }
                if (cell['room'] == "|") {
                    var shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    shape.setAttribute('x',  x*scale + scale/2 - scale/6 -1);
                    shape.setAttribute('y',  y*scale + scale/2 - scale/2);
                    shape.setAttribute('width',  scale/3 + 2);
                    shape.setAttribute('height',  scale);
                    shape.setAttribute('fill',  "black");
                    svg.appendChild(shape);
                    var shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    shape.setAttribute('x',  x*scale + scale/2 - scale/6 + 1);
                    shape.setAttribute('y',  y*scale + scale/2 - scale/2 - 2);
                    shape.setAttribute('width',  scale/3 - 2);
                    shape.setAttribute('height',  scale + 4);
                    shape.setAttribute('fill',  "white");
                    svg.appendChild(shape);
                    if (contents.indexOf('barrier') > -1) {
                        var shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                        shape.setAttribute('x',  x*scale + scale/2 - scale/6);
                        shape.setAttribute('y',  y*scale + scale/2 - 1);
                        shape.setAttribute('width',  scale/3);
                        shape.setAttribute('height',  2);
                        shape.setAttribute('fill',  "grey");
                        svg.appendChild(shape);
                    }
                }
                if (cell['room'] == "-") {
                    var shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    shape.setAttribute('x',  x*scale + scale/2- scale/2);
                    shape.setAttribute('y',  y*scale + scale/2- scale/6-1);
                    shape.setAttribute('width',  scale);
                    shape.setAttribute('height',  scale/3 + 2);
                    shape.setAttribute('fill',  "black");
                    svg.appendChild(shape);
                    var shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    shape.setAttribute('x',  x*scale + scale/2- scale/2 - 2);
                    shape.setAttribute('y',  y*scale + scale/2- scale/6 + 1);
                    shape.setAttribute('width',  scale + 4);
                    shape.setAttribute('height',  scale/3 - 2);
                    shape.setAttribute('fill',  "white");
                    svg.appendChild(shape);
                    if (contents.indexOf('barrier') > -1) {
                        var shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                        shape.setAttribute('x',  x*scale + scale/2- 1);
                        shape.setAttribute('y',  y*scale + scale/2- scale/6);
                        shape.setAttribute('width',  2);
                        shape.setAttribute('height',  scale/3);
                        shape.setAttribute('fill',  "grey");
                        svg.appendChild(shape);
                     }
                }
                if (contents.indexOf("goal") > -1) {
                    var shape = document.createElementNS("http://www.w3.org/2000/svg", "image");
                    shape.setAttribute('x',  x*scale );
                    shape.setAttribute('y',  y*scale);
                    shape.setAttribute('height',  scale);
                    shape.setAttribute('width',  scale);
                    shape.setAttributeNS('http://www.w3.org/1999/xlink', "xlink:href", "/images/goal.png")
                    svg.appendChild(shape);

                }
                if (contents.indexOf("switch") > -1) {
                    var shape = document.createElementNS("http://www.w3.org/2000/svg", "image");
                    shape.setAttribute('x',  x*scale + scale/2+ scale/6);
                    shape.setAttribute('y',  y*scale + scale/2+ scale/6);
                    shape.setAttribute('width',  scale/3);
                    shape.setAttribute('height',  scale/3);
                    shape.setAttributeNS('http://www.w3.org/1999/xlink', "xlink:href", "/images/toggle.png")
                    svg.appendChild(shape);
                }
                if (contents.indexOf("me") > -1) {
                    var shape = document.createElementNS("http://www.w3.org/2000/svg", "image");
                    shape.setAttribute('x',  x*scale );
                    shape.setAttribute('y',  y*scale);
                    shape.setAttribute('height',  scale);
                    shape.setAttribute('width',  scale);
                    shape.setAttributeNS('http://www.w3.org/1999/xlink', "xlink:href", "/images/meeple.png")
                    if (board.myturn) {
                        var blinkon = document.createElementNS("http://www.w3.org/2000/svg", "set");
                        blinkon.setAttribute('id', 'show');
                        blinkon.setAttribute('attributeName', 'visibility');
                        blinkon.setAttribute('attributeType', 'CSS');
                        blinkon.setAttribute('to', 'visible');
                        blinkon.setAttribute('begin', '0s; hide.end');
                        blinkon.setAttribute('dur', '1s');
                        blinkon.setAttribute('fill', 'freeze');
                        var blinkoff = document.createElementNS("http://www.w3.org/2000/svg", "set");
                        blinkoff.setAttribute('id', 'hide');
                        blinkoff.setAttribute('attributeName', 'visibility');
                        blinkoff.setAttribute('attributeType', 'CSS');
                        blinkoff.setAttribute('to', 'hidden');
                        blinkoff.setAttribute('begin', 'show.end');
                        blinkoff.setAttribute('dur', '1s');
                        blinkoff.setAttribute('fill', 'freeze');
                        shape.appendChild(blinkon);
                        shape.appendChild(blinkoff);
                    }
                    svg.appendChild(shape);
                }
          }
        }
      }








})(typeof exports === 'undefined'? this['gamecommon']={}: exports);
