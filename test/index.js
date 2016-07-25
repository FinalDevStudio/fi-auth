'use strict';

const session = require('express-session');
const bodyParser = require('body-parser');
const request = require('request');
const express = require('express');
const expect = require('chai').expect;
const auth = require('../lib');

const responses = {
  hello: 'Hello, world!'
};

/* The auth component configuration */
const config = {
  debug: true,

  authorizer: (req) => {
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
    allows: 'admin'
  }, {
    path: ['/no-methods*'],
    allows: ['admin', 'user']
  }]
};

var rq;

describe('Fi Auth', function () {
  before(function (done) {
    /* Create the express app */
    var app = express();

    /* Body parser first */
    app.use(bodyParser.urlencoded({
      extended: false
    }));

    app.use(bodyParser.json());

    /* Initialize the session before anything else */
    app.use(session({
      secret: 'super secret session key',
      saveUninitialized: true,
      resave: true,
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

    app.get('/users', function (req, res) {
      res.status(204).end();
    });

    app.get('/no-methods', function (req, res) {
      res.status(204).end();
    });

    app.get('/no-methods/:id', function (req, res) {
      res.status(204).end();
    });

    const server = app.listen(0, () => {
      /* Initialize the request object */
      rq = request.defaults({
        baseUrl: 'http://localhost:' + server.address().port,
        jar: true
      });

      done();
    });
  });

  describe('object', function () {
    it('should be a function', function () {
      expect(auth).to.be.a('function');
    });
  });

  describe('server', function () {
    it('should respond a 200 status code and \'Hello Word!\' as body',
      function (done) {
        rq('/', function (err, res, body) {
          expect(err).to.be.null;

          expect(res.statusCode).to.be.a('number');
          expect(res.statusCode).to.equal(200);

          expect(body).to.be.a('string');
          expect(body).to.equal(responses.hello);

          expect(res.headers).to.be.an('object');

          done();
        });
      });
  });

  describe('auth', function () {
    it('[GET /users] should respond a 403 status code', function (done) {
      rq('/users', function (err, res) {
        expect(err).to.be.null;

        expect(res.statusCode).to.be.a('number');
        expect(res.statusCode).to.equal(403);

        done();
      });
    });

    it('[GET /no-methods] should respond a 403 status code', function (
      done) {
      rq('/no-methods', function (err, res) {
        expect(err).to.be.null;

        expect(res.statusCode).to.be.a('number');
        expect(res.statusCode).to.equal(403);

        done();
      });
    });

    it('[GET /no-methods/22] should respond a 403 status code',
      function (done) {
        rq('/no-methods/22', function (err, res) {
          expect(err).to.be.null;

          expect(res.statusCode).to.be.a('number');
          expect(res.statusCode).to.equal(403);

          done();
        });
      });

    it(
      '[POST /login] should login a user and respond a 204 status code',
      function (done) {
        request.post({
          uri: '/login',
          form: {
            admin: false
          }
        }, function (err, res) {
          expect(err).to.be.null;

          expect(res.statusCode).to.be.a('number');
          expect(res.statusCode).to.equal(204);

          done();
        });
      });

    it('[GET /users] should respond a 204 status code', function (done) {
      rq('/users', function (err, res) {
        expect(err).to.be.null;

        expect(res.statusCode).to.be.a('number');
        expect(res.statusCode).to.equal(204);

        done();
      });
    });

  });
});
