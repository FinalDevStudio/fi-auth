/**
 * Fi Seed's Component Auth.
 *
 * This component is used to configure route authorization on an Express application.
 *
 * @type Node Module
 */

'use strict';

var type = require('type-of-is');
var debug = require('debug');

/**
 * Authorizes a route for the current session.
 *
 * @type Express Middleware.
 *
 * @param route {Object} The route object.
 * @param req {Object} Express' req object.
 * @param res {Object} Express' res object.
 * @param next {Function} Express' next function.
 */
function authorize(route, req, res, next) {
  var allowed = true;

  switch (type.is(route.allows)) {
    case Array:
      allowed = route.allows.indexOf(req.session.authorized) > -1;
      break;

    case String:
      allowed = route.allows === req.session.authorized;
      break;
  }

  if (allowed) {
    debug("%s %s --> [%s]-[%s] --> OK", req.method, req.path, route.allows, req.session.authorized);
    return next();
  }

  debug("%s %s --> [%s]-[%s] --> DENY", req.method, req.path, route.allows, req.session.authorized);

  res.status(403).end();
}

/**
 * Initializes and registers route athuorizations.
 *
 * @param app {Object} Express application.
 * @param config {Object} Configuration object.
 */
function auth(app, config) {

  if (!type.is(config.authorizer, Function)) {
    throw new TypeError("Authorizer must be a function!");
  }

  if (type.is(config.debug, String)) {
    debug = debug(config.debug);
  } else if (config.debug) {
    debug = console.log;
  } else {
    debug = function () {};
  }

  /* Set the session authorized property */
  app.use(function (req, res, next) {
    req.session.authorized = config.authorizer(req);
    next();
  });

  /* Filter each path */
  config.routes.forEach(function (route) {
    if (!type.is(route.path, Array) || !type.is(route.path, String)) {
      throw new TypeError("The route's path must be a String or an Array of strings!");
    }

    debug("%s --> %s : %s", route.method, route.path, route.allows);

    function callback(req, res, next) {
      authorize(route, req, res, next);
    }

    var router = app.route(route.path);

    /* If method is an array */
    if (type.is(route.method, Array)) {
      return route.method.forEach(function (method) {
        router[method.toLowerCase()](callback);
      });
    }

    /* If method is a string */
    if (type.is(route.method, String)) {
      return router[route.method.toLowerCase()](callback);
    }

    /* If no method is specified default to ALL */
    router(callback);

  });

}

module.exports = auth;
