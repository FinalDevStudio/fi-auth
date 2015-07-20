'use strict';

var type = require('type-of-is');
var debug = require('debug');

function authorize(path, req, res, next) {
  var allowed = true;

  switch (type.is(path.allows)) {
    case Array:
      allowed = path.allows.indexOf(req.session.authorized) >= 0;
      break;

    case String:
      allowed = path.allows === req.session.authorized;
      break;
  }

  if (allowed) {
    debug("%s %s --> [%s]-[%s] --> OK", req.method, req.path, path.allows, req.session.authorized);
    return next();
  }

  debug("%s %s --> [%s]-[%s] --> DENY", req.method, req.path, path.allows, req.session.authorized);

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
  config.paths.forEach(function (path) {
    if (!path.route) {
      return debug("No route specified! --> %s", JSON.stringify(path));
    }

    var route = app.route(path.route);

    debug("%s --> %s : %s", path.method, path.route, path.allows);

    function callback(req, res, next) {
      authorize(path, req, res, next);
    }

    /* If method is an array */
    if (type.is(path.method, Array)) {
      return path.method.forEach(function (method) {
        route[method.toLowerCase()](callback);
      });
    }

    /* If method is a string */
    if (type.is(path.method, String)) {
      return route[path.method.toLowerCase()](callback);
    }

    /* If no method is specified, default to All */
    route.all(callback);

  });

};
