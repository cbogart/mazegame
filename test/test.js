var gameserver = require('../gameserver');
var boot = gameserver.boot;
var shutdown = gameserver.shutdown;
var port = gameserver.port;
var assert = require('assert');
var http = require('http');

describe('server', function() {
  before(function () { boot(); })
  describe('static directories', function () {
    it('should send meeple.png on request', function () {

      http.get('http://localhost:' + port + "/images/meeple.png", function(res) {
        assert.equal(res.status, 200);
      }).on('error', function(e) {
        assert.fail(e.message, "(correct download)", "Download of meeple.png failed", "###");
      });
    });
  });
  after(function() { shutdown(); })
});
