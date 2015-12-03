'use strict';

var is = require('is_js');

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

  if (is.array(route.allows)) {
    allowed = route.allows.indexOf(req.session.authorized) > -1;
  } else if (is.string(route.allows)) {
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
  if (is.not.function(config.authorizer)) {
    throw new Error("Authorizer must be a [Function]!");
  }

  /* Check debug type */
  if (is.function(config.debug)) {
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
    if (is.not.array(route.path) && is.not.string(route.path)) {
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
    if (is.array(route.method)) {
      return route.method.forEach(function (method) {
        router[method.toLowerCase()](callback);
      });
    }

    /* If method is a string */
    if (is.string(route.method)) {
      return router[route.method.toLowerCase()](callback);
    }

    /* If no method is specified default to ALL */
    router(callback);
  });
}

module.exports = auth;
