'use strict';

const is = require('fi-is');

var debug = function () {};

const ERR_AUTHORIZER = 'Authorizer must be a [Function]!';
const ERR_NORMALIZE_ROUTE = 'The route\'s path must be a [String] ' +
  'or an [Array] of [String]s!';

const ALLOW = 'ALLOW';
const DENY = 'DENY';
const ALL = 'ALL';

/**
 * Normalizes a route object.
 */
function normalize(route) {
  if (is.not.array(route.path) && is.not.string(route.path)) {
    throw new Error(ERR_NORMALIZE_ROUTE);
  }

  if (is.array(route.method)) {
    /* If method is an array */
    route.method.forEach((method, i) => {
      route.method[i] = method.toLowerCase();
    });
  }

  /* If method is a string */
  if (is.string(route.method)) {
    route.method = route.method.toLowerCase();
  }

  return route;
}

/**
 * Authorizes a route for the current session.
 *
 * @type Express Middleware.
 */
function authorize(req, res, next) {
  var authorized = req.session.authorized;
  var allows = req.route.allows;
  var allowed = false;

  if (is.string(allows)) {
    if (is.string(authorized)) {
      allowed = allows === authorized;
    } else if (is.array(authorized)) {
      allowed = authorized.indexOf(allows) > -1;
    }
  } else if (is.array(allows)) {
    if (is.string(authorized)) {
      allowed = allows.indexOf(authorized) > -1;
    } else if (is.array(authorized)) {
      for (var i = 0, l = authorized.length; i < l; i++) {
        allowed = allows.indexOf(authorized[i]) > -1;

        if (allowed) {
          break;
        }
      }
    }
  }

  debug(`${ req.method } ${ req.path } (${ allows }) : ` +
    `(${ authorized }) --> ${ allowed ? ALLOW : DENY }`);

  if (allowed) {
    return next();
  }

  res.sendStatus(403);
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

/**
 * Logs to the console an auth assignment. Debug only.
 */
function logAssignment(method, path, allows) {
  debug(`${ method.toUpperCase() } ${ path } (${ allows })`);
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
    throw new Error(ERR_AUTHORIZER);
  }

  /* Check debug type */
  if (is.function(config.debug)) {
    debug = config.debug;
  } else if (config.debug) {
    debug = console.log.bind(console);
  }

  /* Set the authorized property in 'req.session' */
  app.use((req, res, next) => {
    req.session.authorized = config.authorizer(req);
    next();
  });

  /* Set authorization rules for each route */
  config.routes.forEach((route) => {
    route = normalize(route);

    var router = app.route(route.path);

    if (is.array(route.method) && route.method.length) {
      route.method.forEach((method) => {
        logAssignment(method, route.path, route.allows);
        router[method](generate(route.allows), authorize);
      });
    } else if (is.string(route.method)) {
      logAssignment(route.method, route.path, route.allows);
      router[route.method](generate(route.allows), authorize);
    } else {
      logAssignment(ALL, route.path, route.allows);
      router.all(generate(route.allows), authorize);
    }
  });
}

module.exports = auth;
