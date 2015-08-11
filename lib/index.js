'use strict';

var type = require('type-of-is');

var debug = function () {};

/**
 * Authorizes a route for the current session.
 *
 * @type Express Middleware.
 *
 * @param {Object} route The route object.
 * @param {Object} req Express' req object.
 * @param {Object} res Express' res object.
 * @param {Function} next Express' next function.
 */
function authorize(route, req, res, next) {
  var allowed = true;

  if (type.is(route.allows, Array)) {
    allowed = route.allows.indexOf(req.session.authorized) > -1;
  } else if (type.is(route.allows, String)) {
    allowed = route.allows === req.session.authorized;
  }

  debug(req.method + " " + req.path + " [" + route.allows + "][" + req.session.authorized + "] : " + (allowed ? "OK" : "DENY"));

  if (allowed) {
    return next();
  }

  res.status(403).end();
}

/**
 * Initializes and registers route athuorizations.
 *
 * @param {Object} app Express application.
 * @param {Object} config Configuration object.
 */
function auth(app, config) {
  /* Ensure authorizer */
  if (!type.is(config.authorizer, Function)) {
    throw new Error("Authorizer must be a [Function]!");
  }

  /* Check debug type */
  if (type.is(config.debug, Function)) {
    debug = config.debug;
  } else if (config.debug) {
    debug = console.log;
  }

  app.use(function (req, res, next) {
    /* Set the session authorized property */
    req.session.authorized = config.authorizer(req);

    next();
  });

  /* Set authorization rules for each path */
  config.routes.forEach(function (route) {
    if (!type.is(route.path, Array) && !type.is(route.path, String)) {
      throw new Error("The route's path must be a [String] or an [Array] of [String]s!");
    }

    debug(route.method + " " + route.path + " --> " + route.allows);

    /* Callback for each method */
    function callback(req, res, next) {
      authorize(route, req, res, next);
    }

    /* The base router */
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
