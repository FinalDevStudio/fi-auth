'use strict';

var type = require('type-of-is');
var debug = require('debug');

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

module.exports = function (app, config) {

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
    if (!route.path) {
      return debug("No route specified! --> %s", JSON.stringify(route));
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

    /* If no method is specified, default to All */
    router(callback);

  });

};
