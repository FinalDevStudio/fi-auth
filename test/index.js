'use strict';

var session = require('express-session');
var request = require('superagent');
var express = require('express');
var expect = require('chai').expect;
var auth = require('../lib');

var app, host;

var responses = {
  hello: "Hello, world!"
};

var logins = {
  user: {},

  admin: {
    admin: true
  }
};

/* the auth component configuration */
var config = {
  authorizer: function (req) {
    if (req.session.user) {
      if (req.session.user.admin) {
        return 'admin';
      }

      return 'user';
    }

    return null;
  },

  routes: [{
    method: 'GET',
    path: '/users',
    allows: 'admin'
  }, {
    method: 'GET',
    path: '/profile',
    allows: [
      'user',
      'admin'
    ]
  }, {
    method: [
      'GET',
      'POST',
      'PUT'
    ],
    path: [
      '/admins',
      '/admins/dashboard'
    ],
    allows: [
      'admin'
    ]
  }]
};

describe('FiAuth', function () {
  before(function (done) {
    /* Create the express app */
    app = express();

    /* Initialize the session before anything else */
    app.use(session({
      secret: 'super secret session key',
      saveUninitialized: true,
      resave: false,
      cookie: {
        secure: false
      }
    }));

    /* Initialize the auth component before any route declaration */
    auth(app, config);

    /* Now declare the routes */
    app.get('/', function (req, res) {
      res.send(responses.hello);
    });

    app.post('/login', function (req, res) {
      req.session.user = req.body;
      res.status(204).end();
    });

    app.post('/logout', function (req, res) {
      delete req.session.user;
      res.status(204).end();
    });

    app.all(function (req, res) {
      res.status(204).end();
    });

    var server = app.listen(0, function () {
      host = 'http://localhost:' + server.address().port;

      console.log("Express app listening at %s\n", host);

      done();
    });
  });

  describe('object', function () {
    it('should be a function', function () {
      expect(auth).to.be.a('function');
    });
  });

  describe('server', function (done) {
    it('should respond a 200 status code and "Hello Word!" as body', function () {
      request.get(host).end(function (err, res) {
        if (err) {
          return done(err);
        }

        expect(res.statusCode).to.be.a('number');
        expect(res.statusCode).to.equal(200);

        expect(res.body).to.be.a('string');
        expect(res.body).to.equal(responses.hello);

        done();
      });
    });
  });

  describe('auth', function (done) {
    it('should respond a 403 status code and an empty body ', function () {
      request.get(host + '/users').end(function (err, res) {
        if (err) {
          return done(err);
        }

        expect(res.statusCode).to.be.a('number');
        expect(res.statusCode).to.equal(403);

        expect(res.body).to.be.empty;

        done();
      });
    });

    it('should login a user and respond a 204 status code with an empty body ', function () {
      request.post(host + '/login').send(logins.user).end(function (err, res) {
        if (err) {
          return done(err);
        }

        expect(res.statusCode).to.be.a('number');
        expect(res.statusCode).to.equal(204);

        expect(res.body).to.be.empty;

        done();
      });
    });

    it('should respond a 204 status code and an empty body', function () {
      request.get(host + '/users').end(function (err, res) {
        if (err) {
          return done(err);
        }

        expect(res.statusCode).to.be.a('number');
        expect(res.statusCode).to.equal(204);

        expect(res.body).to.be.empty;

        done();
      });
    });

    it('should respond a 403 status code and an empty body', function () {
      request.get(host + '/admins').end(function (err, res) {
        if (err) {
          return done(err);
        }

        expect(res.statusCode).to.be.a('number');
        expect(res.statusCode).to.equal(204);

        expect(res.body).to.be.empty;

        done();
      });
    });
  });
});
