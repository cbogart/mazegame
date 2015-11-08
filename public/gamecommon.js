
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
   exports.addElt = function(svg, tag, attrs) {
     var shape = document.createElementNS("http://www.w3.org/2000/svg", tag);
     for (a in attrs) {
       if (a.slice(0, 6) == "xlink:") {
         shape.setAttributeNS('http://www.w3.org/1999/xlink', a, attrs[a]);
       } else {
         shape.setAttribute(a, attrs[a]);
       }
     }
     svg.appendChild(shape);
     return shape;
   }

   exports.drawGame = function (board, svgjq) {
        svgjq.empty();
        addElt = exports.addElt;
        svg = svgjq[0];
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
                    addElt(svg, "rect", {'x': x*scale,   'y': y*scale,
                                         'width': scale, 'height': scale,
                                         'stroke':  "black",
                                         'fill':  "white"});
                }
                if (cell['room'] == "|") {
                    addElt(svg, "rect", { 'x':  x*scale + scale/2 - scale/6 -1,
                                          'y':  y*scale + scale/2 - scale/2,
                                          'width':  scale/3 + 2,
                                          'height':  scale,
                                          'fill':  "black"});
                    addElt(svg, "rect", {'x':  x*scale + scale/2 - scale/6 + 1,
                                          'y':  y*scale + scale/2 - scale/2 - 2,
                                          'width':  scale/3 - 2,
                                          'height':  scale + 4,
                                          'fill':  "white"});
                    if (contents.indexOf('barrier') > -1) {
                        addElt(svg, "rect", {'x':  x*scale + scale/2 - scale/6,
                                              'y':  y*scale + scale/2 - 1,
                                              'width':  scale/3,
                                              'height':  2,
                                              'fill':  "grey"});
                    }
                }
                if (cell['room'] == "-") {
                  addElt(svg, "rect", {'x':  x*scale + scale/2- scale/2,
                                       'y':  y*scale + scale/2- scale/6-1,
                                          'width':  scale,
                                          'height':  scale/3 + 2,
                                          'fill':  "black"});
                    addElt(svg, "rect", { 'x':  x*scale + scale/2- scale/2 - 2,
                                          'y':  y*scale + scale/2- scale/6 + 1,
                                          'width':  scale + 4,
                                          'height':  scale/3 - 2,
                                          'fill':  "white"});
                    if (contents.indexOf('barrier') > -1) {
                        addElt(svg, "rect", {'x':  x*scale + scale/2- 1,
                                             'y':  y*scale + scale/2- scale/6,
                                              'width':  2,
                                              'height':  scale/3,
                                              'fill':  "grey"});
                     }
                }
                if (contents.indexOf("goal") > -1) {
                    addElt(svg, "image", {'x':  x*scale+2 , 'y':  y*scale+2,
                                          'height':  scale-4,  'width':  scale-4,
                                          'xlink:href': '/images/goal.png'});
                }
                if (contents.indexOf("switch") > -1) {
                    addElt(svg, "image", {'x':  x*scale + scale/2+ scale/6,
                                          'y':  y*scale + scale/2+ scale/6,
                                          'width': scale/3, 'height':  scale/3,
                                          'xlink:href': '/images/toggle.png'});
                }
                if (contents.indexOf("me") > -1) {
                    var shape = addElt(svg, "image", {'x':  x*scale, 'y':  y*scale,
                                          'height': scale, 'width':  scale,
                                          "xlink:href": "/images/meeple.png"});
                    if (board.myturn) {
                        addElt(shape, "set", {'id': 'show',
                                              'attributeName': 'visibility',
                                              'attributeType': 'CSS',
                                              'to': 'visible',
                                              'begin': '0s; hide.end',
                                              'dur': '.2s',
                                              'fill': 'freeze'});
                        addElt(shape, "set", {'id': 'hide',
                                              'attributeName': 'visibility',
                                              'attributeType': 'CSS',
                                              'to': 'hidden',
                                              'begin': 'show.end',
                                              'dur': '.2s',
                                              'fill': 'freeze'});
                    }
                    //svg.appendChild(shape);
                }
          }
        }
      }








})(typeof exports === 'undefined'? this['gamecommon']={}: exports);
