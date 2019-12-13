const is = require('fi-is');

let debug = console.log.bind(console);

/**
 * Normalizes a route object.
 */
function normalize (route) {
  if (is.not.array(route.path) && is.not.string(route.path)) {
    throw new Error('The route\'s path must be a [String] or an [Array] of [String]s!');
  }

  let method;

  if (is.array(route.method)) {
    method = route.method.map(method => method.toLowerCase());
  }

  if (is.string(route.method)) {
    method = route.method.toLowerCase();
  }

  return {
    ...route,
    method
  };
}

/**
 * Authorizes a route for the current session.
 *
 * @type Express Middleware.
 */
function authorize (req, res, next) {
  const { authorized } = req.session;
  const { allows } = req.route;

  let allowed = false;

  if (is.string(allows)) {
    if (is.string(authorized)) {
      allowed = allows === authorized;
    } else if (is.array(authorized)) {
      allowed = authorized.includes(allows);
    }
  } else if (is.array(allows)) {
    if (is.string(authorized)) {
      allowed = allows.includes(authorized);
    } else if (is.array(authorized)) {
      for (const auth of authorized) {
        allowed = allows.includes(auth);

        if (allowed) {
          break;
        }
      }
    }
  }

  debug(`${req.method} ${req.path} (${allows}) : (${authorized}) --> ${allowed ? 'ALLOW' : 'DENY'}`);

  if (allowed) {
    return next();
  }

  res.sendStatus(403);
}

/**
 * Generates the Express middleware to associate the allowed values to the route.
 */
function generate (allows) {
  return (req, res, next) => {
    req.route.allows = allows;
    next();
  };
}

/**
 * Logs to the console an auth assignment. Debug only.
 */
function logAssignment (method, path, allows) {
  debug(`${method.toUpperCase()} ${path} (${allows})`);
}

/**
 * Initializes and registers route authorizations.
 *
 * @param {Object} app Express application.
 * @param {Object} config Configuration object.
 */
function auth (app, config) {
  /* Ensure authorizer */
  if (is.not.function(config.authorizer)) {
    throw new Error('Authorizer must be a [Function]!');
  }

  /* Check debug type */
  if (is.function(config.debug)) {
    debug = config.debug;
  }

  /* Set the authorized property in 'req.session' */
  app.use((req, res, next) => {
    req.session.authorized = config.authorizer(req);
    next();
  });

  /* Set authorization rules for each route */
  for (const route of config.routes) {
    const _route = normalize(route);
    const router = app.route(_route.path);

    if (is.array(_route.method) && _route.method.length > 0) {
      for (const method of _route.method) {
        logAssignment(method, _route.path, _route.allows);
        const middleware = generate(_route.allows);
        router[String(method)](middleware, authorize);
      }
    } else if (is.string(_route.method)) {
      logAssignment(_route.method, _route.path, _route.allows);
      const middleware = generate(_route.allows);
      router[String(_route.method)](middleware, authorize);
    } else {
      logAssignment('ALL', _route.path, _route.allows);
      const middleware = generate(_route.allows);
      router.all(middleware, authorize);
    }
  }
}

module.exports = auth;
