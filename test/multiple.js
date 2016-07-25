'use strict';

const session = require('express-session');
const bodyParser = require('body-parser');
const expect = require('chai').expect;
const request = require('request');
const express = require('express');
const auth = require('../lib');

const responses = {
  hello: 'Hello, world!'
};

const ADMIN = 'admin';
const USER = 'user';
const POST = 'POST';
const GET = 'GET';
const PUT = 'PUT';

/* The auth component configuration */
const CONFIG = {
  debug: true,

  authorizer: (req) => {
    if (req.session.user) {
      if (req.session.user.admin) {
        return [ADMIN];
      }

      return [USER];
    }

    return [];
  },

  routes: [{
    method: GET,
    path: '/users',
    allows: ADMIN
  }, {
    method: GET,
    path: '/profile',
    allows: [USER, ADMIN]
  }, {
    method: [GET, POST, PUT],
    path: [
      '/admins',
      '/admins/dashboard'
    ],
    allows: ADMIN
  }, {
    path: ['/no-methods*'],
    allows: [USER, ADMIN]
  }]
};

var rq;

describe('Fi Auth (multiple user roles (array))', function () {
  before(function (done) {
    /* Create the express app */
    const APP = express();

    /* Body parser first */
    APP.use(bodyParser.urlencoded({
      extended: false
    }));

    APP.use(bodyParser.json());

    /* Initialize the session before anything else */
    APP.use(session({
      secret: 'my:$up3R_5ecrE7-Se5s10n_k3Y==',
      saveUninitialized: true,
      resave: true,
      cookie: {
        secure: false
      }
    }));

    /* Initialize the auth component before any route declaration */
    auth(APP, CONFIG);

    /* Now declare the routes */
    APP.get('/', function (req, res) {
      res.send(responses.hello);
    });

    APP.post('/login', function (req, res) {
      req.session.user = req.body;
      res.sendStatus(204);
    });

    APP.get('/users', function (req, res) {
      res.sendStatus(204);
    });

    APP.get('/no-methods', function (req, res) {
      res.sendStatus(204);
    });

    APP.get('/no-methods/:id', function (req, res) {
      res.sendStatus(204);
    });

    const server = APP.listen(0, () => {
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
      }
    );
  });

  describe('auth', function () {
    it('[GET /users] should respond a 403 status code',
      function (done) {
        rq('/users', function (err, res) {
          expect(err).to.be.null;

          expect(res.statusCode).to.be.a('number');
          expect(res.statusCode).to.equal(403);

          done();
        });
      }
    );

    it('[GET /no-methods] should respond a 403 status code',
      function (
        done) {
        rq('/no-methods', function (err, res) {
          expect(err).to.be.null;

          expect(res.statusCode).to.be.a('number');
          expect(res.statusCode).to.equal(403);

          done();
        });
      }
    );

    it('[GET /no-methods/22] should respond a 403 status code',
      function (done) {
        rq('/no-methods/22', function (err, res) {
          expect(err).to.be.null;

          expect(res.statusCode).to.be.a('number');
          expect(res.statusCode).to.equal(403);

          done();
        });
      }
    );

    it('[POST /login] should login a user and respond a 204 status code',
      function (done) {
        rq.post({
          uri: '/login',
          form: {
            admin: false
          }
        }, (err, res) => {
          expect(err).to.be.null;

          expect(res.statusCode).to.be.a('number');
          expect(res.statusCode).to.equal(204);

          done();
        });
      }
    );

    it('[GET /users] should respond a 204 status code',
      function (done) {
        rq('/users', function (err, res) {
          expect(err).to.be.null;

          expect(res.statusCode).to.be.a('number');
          expect(res.statusCode).to.equal(204);

          done();
        });
      }
    );

  });
});