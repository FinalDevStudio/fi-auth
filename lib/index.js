'use strict';

var is = require('is_js');

var debug = function () {};

var GET_RE = /.*(get).*/gi;
var POST_RE = /.*(post).*/gi;
var PUT_RE = /.*(put).*/gi;
var DELETE_RE = /.*(delete).*/gi;
var $1 = '$1';

/**
 * Returns a clean, lower case method name.
 */
function clean(method) {
  if (method.match(GET_RE)) {
    return method.replace(GET_RE, $1).toLowerCase();
  }

  if (method.match(POST_RE)) {
    return method.replace(POST_RE, $1).toLowerCase();
  }

  if (method.match(PUT_RE)) {
    return method.replace(PUT_RE, $1).toLowerCase();
  }

  if (method.match(DELETE_RE)) {
    return method.replace(DELETE_RE, $1).toLowerCase();
  }

  throw new Error("Invalid method [" + method + "]!");
}

/**
 * Normalizes a route object.
 */
function normalize(route) {
  if (is.not.array(route.path) && is.not.string(route.path)) {
    throw new Error("The route's path must be a [String] or an [Array] of [String]s!");
  }

  if (is.array(route.method)) {
    /* If method is an array */
    route.method.forEach(function (method, index) {
      route.method[index] = clean(method);
    });
  }

  /* If method is a string */
  if (is.string(route.method)) {
    route.method = clean(route.method);
  }

  return route;
}

/**
 * Authorizes a route for the current session.
 *
 * @type Express Middleware.
 */
function authorize(req, res, next) {
  var allowed = true;

  if (is.array(req.allows)) {
    allowed = req.route.allows.indexOf(req.session.authorized) > -1;
  } else if (is.string(req.route.allows)) {
    allowed = req.route.allows === req.session.authorized;
  }

  debug(req.method + " " + req.path + " (" + req.route.allows + ") : [" + req.session.authorized + "] --> " + (allowed ? "ALLOW" : "DENY"));

  if (allowed) {
    return next();
  }

  res.status(403).end();
}

/**
 * Generates the Express middleware to associate the allowed values to the route.
 */
function generate(allows) {
  return function (req, res, next) {
    req.route.allows = allows;

    next();
  };
}

function logAssign(method, path, allows) {
  debug(String(method).toUpperCase() + " " + path + " --> " + allows);
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

  /* Set the authorized property in 'req.session' */
  app.use(function (req, res, next) {
    req.session.authorized = config.authorizer(req);

    next();
  });

  function onEachRoute(route) {
    route = normalize(route);

    var router = app.route(route.path);

    if (is.array(route.method) && route.method.length) {
      route.method.forEach(function (method) {
        logAssign(method, route.path, route.allows);
        router[method](generate(route.allows), authorize);
      });
    } else if (is.string(route.method)) {
      logAssign(route.method, route.path, route.allows);
      router[route.method](generate(route.allows), authorize);
    } else {
      logAssign('ALL', route.path, route.allows);
      router.all(generate(route.allows), authorize);
    }
  }

  /* Set authorization rules for each route */
  config.routes.forEach(onEachRoute);
}

module.exports = auth;
