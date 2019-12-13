const request = require('request-promise-native');
const session = require('express-session');
const bodyParser = require('body-parser');
const { expect } = require('chai');
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
const config = {
  debug: true,

  authorizer: req => {
    if (req.session.user) {
      if (req.session.user.admin) {
        if (req.query.array) {
          return [ADMIN];
        }

        return ADMIN;
      }

      if (req.query.array) {
        return [USER];
      }

      return USER;
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

describe('Fi Auth', function () {
  let rp, server;

  describe('Module', function () {
    it('should be a function', function () {
      expect(auth).to.be.a('function');
    });

    it('should throw on invalid app or config', function () {
      const app = express();
      const _cfg = {
        ...config,
        authorizer: null
      };

      expect(auth.bind(null, null, null)).to.throw(Error);
      expect(auth.bind(null, app, null)).to.throw(Error);
      expect(auth.bind(null, app, {})).to.throw(Error);
      expect(auth.bind(null, app, _cfg)).to.throw(Error);
    });

    it('should throw on invalid routes config', function () {
      const app = express();
      const _cfg = {
        ...config,
        routes: [{
          path: null
        }]
      };

      expect(auth.bind(null, app, _cfg)).to.throw(Error);
    });

    it('should set a debug function', function () {
      const app = express();

      expect(auth.bind(null, app, { ...config, debug: () => { } })).to.not.throw(Error);
    });
  });

  describe('Functionality', function () {
    before(function (done) {
      /* Create the express app */
      const app = express();

      /* Body parser first */
      app.use(bodyParser.urlencoded({
        extended: true
      }));

      app.use(bodyParser.json());

      /* Initialize the session before anything else */
      app.use(session({
        secret: 'my:$up3R_5ecrE7-Se5s10n_k3Y==',
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
        res.sendStatus(204);
      });

      app.get(['/users', '/profile', '/admins', '/admins/dashboard'], function (req, res) {
        res.sendStatus(204);
      });

      app.get('/no-methods', function (req, res) {
        res.sendStatus(204);
      });

      app.get('/no-methods/:id', function (req, res) {
        res.sendStatus(204);
      });

      server = app.listen(0, () => {
        /* Initialize the request object */
        rp = request.defaults({
          baseUrl: 'http://localhost:' + server.address().port,
          resolveWithFullResponse: true,
          simple: false,
          jar: true
        });

        done();
      });
    });

    it('should respond a 200 status code and \'Hello Word!\' as body', async function () {
      const res = await rp('/');

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(200);

      expect(res.body).to.be.a('string');
      expect(res.body).to.equal(responses.hello);

      expect(res.headers).to.be.an('object');
    });

    it('[GET /users] should respond a 403 status code', async function () {
      const res = await rp('/users');

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(403);
    });

    it('[GET /no-methods] should respond a 403 status code', async function () {
      const res = await rp('/no-methods');

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(403);
    });

    it('[GET /no-methods/22] should respond a 403 status code', async function () {
      const res = await rp('/no-methods/22');

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(403);
    });

    it('[POST /login] should login a user and respond a 204 status code', async function () {
      const res = await rp.post({
        uri: '/login',
        json: {
          admin: false
        }
      });

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(204);
    });

    it('[GET /profile] should respond a 204 status code', async function () {
      const res = await rp('/profile');

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(204);
    });

    it('[GET /profile] should respond a 204 status code (array)', async function () {
      const res = await rp('/profile', { qs: { array: true } });

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(204);
    });

    it('[GET /users] should respond a 403 status code (logged in)', async function () {
      const res = await rp('/users');

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(403);
    });

    it('[GET /users] should respond a 403 status code (array) (logged in)', async function () {
      const res = await rp('/users', { qs: { array: true } });

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(403);
    });

    it('[GET /admins] should respond a 403 status code (logged in)', async function () {
      const res = await rp('/admins');

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(403);
    });

    it('[GET /admins] should respond a 403 status code (array) (logged in)', async function () {
      const res = await rp('/admins', { qs: { array: true } });

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(403);
    });

    it('[GET /admins/dashboard] should respond a 403 status code (logged in)', async function () {
      const res = await rp('/admins/dashboard');

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(403);
    });

    it('[GET /admins/dashboard] should respond a 403 status code (array) (logged in)', async function () {
      const res = await rp('/admins/dashboard', { qs: { array: true } });

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(403);
    });

    it('[POST /login] should login an admin and respond a 204 status code', async function () {
      const res = await rp.post({
        uri: '/login',
        json: {
          admin: true
        }
      });

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(204);
    });

    it('[GET /users] should respond a 204 status code', async function () {
      const res = await rp('/users');

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(204);
    });

    it('[GET /users] should respond a 204 status code (array)', async function () {
      const res = await rp('/users', { qs: { array: true } });

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(204);
    });

    it('[GET /admins] should respond a 204 status code', async function () {
      const res = await rp('/admins');

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(204);
    });

    it('[GET /admins] should respond a 204 status code (array)', async function () {
      const res = await rp('/admins', { qs: { array: true } });

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(204);
    });

    it('[GET /admins/dashboard] should respond a 204 status code', async function () {
      const res = await rp('/admins/dashboard');

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(204);
    });

    it('[GET /admins/dashboard] should respond a 204 status code (array)', async function () {
      const res = await rp('/admins/dashboard', { qs: { array: true } });

      expect(res.statusCode).to.be.a('number');
      expect(res.statusCode).to.equal(204);
    });

    after(function (done) {
      if (server) {
        server.close(done);
      }
    });
  });
});
