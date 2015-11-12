var gameserver = require('../gameserver');
var boot = gameserver.boot;
var shutdown = gameserver.shutdown;
var port = gameserver.port;
var assert = require('assert');
var http = require('http');
var Browser = require('zombie');

describe('server', function() {
  this.timeout(2000);
  before(function() {
    boot();
    this.browser1 = new Browser();
    this.browser2 = new Browser();
  });
  before(function(done) {
    this.browser1.visit("http://localhost:8080/", done);
  });
  before(function(done) {
    this.browser2.visit("http://localhost:8080/", done);
  });
  describe('static directories', function() {
    it('should send meeple.png on request', function() {

      http.get('http://localhost:' + port + "/images/meeple.png", function(res) {
        assert.equal(res.status, 200);
      }).on('error', function(e) {
        assert.fail(e.message, "(correct download)", "Download of meeple.png failed", "###");
      });
    });
  });

  describe('game setup', function() {
    it('should deliver form to user arriving at http://localhost:8080', function(done) {
      assert.ok(this.browser1.success);
      assert.ok(this.browser2.success);
      done();
    });
  });
  describe('accept name', function() {
    it('should accept name from user 1, going into wait state', function(done) {
      var b1 = this.browser1;
      b1.fill("#name", "user1");
      b1.pressButton("Enter your name").then(function() {
        b1.window.socket.once('update', function() {
          done();
        });
      });
      it('check name submission output', function() {
        b1.assert.text("#status", "Welcome, user1! Please wait for your partner to join the game.")
        b1.assert.style("#setName", 'display', 'none');
      });
    });
  });
  describe('accept 2nd name and start game', function() {
    it('should accept name from user 2, going into play state', function(done) {
      var b2 = this.browser2;
      b2.fill("#name", "user2");
      b2.pressButton("Enter your name").then(function() {
        b2.window.socket.once('gameupdate', function() {
          done();
        });
      });
    });
      it('check name submission output', function() {
        var b2 = this.browser2;
        b2.assert.style("#setName", 'display', 'none');
        b2.assert.element('image[xlink:href="/images/meeple.png"]');
      });

  });

  after(function() {
    shutdown();
  })
});
