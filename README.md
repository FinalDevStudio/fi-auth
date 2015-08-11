# fi-seed-component-auth
Fi Seed's route authorization component

## Usage

### Use on fi-seed

```js
var auth = component('auth');
```

### Use on Express app

```js
var auth = require('fi-seed-component-auth');
```

### Initialization
You must call it with your Express's app instance, to attach the routes, and a configuration object. It's important to initialize the session before you configure **Auth**:

```js
var auth = require('fi-seed-component-auth');
var session = require('express-session');
var express = require('express');

var app = express();

app.use(session({
  /* Session config */
}));

auth(app, config);

/* And now your routes */
```

### Configuration
The configuration object must have an authorizer function and a route array. The `debug` parameter is optional but recommended.

**IMPORTANT**: All routes are allowed by default!

- **debug**:
  - This option can be a `Function` to log with or a `Boolean`. If `true` it'll use `console.log`.

- **authorizer**:
  - This is required and must be a `Function`. This function is run on each request and should return the value that will be evaluated against the `allows` parameter value inside each route definition. The authorizer result will be attached to `req.session.authorized` so it must return a value to compare against each route's `allows` parameter.

- **routes**:
  - An `Array` with the routes to authorize:
    - **method**: A `String` or an `Array` of HTTP request methods to filter. If no method is specified it defaults to 'ALL';
    - **route**: A `String` or an `Array` of strings to filter.
    - **allows**: A `String` or an `Array` of authorization values to filter:

```js
{
  debug: 'app:auth',

  authorizer: function (req) {
    if (req.session.user) {
      return req.session.user.admin && 'admin' || 'user';
    }

    return false;
  },

  routes: [{
    method: 'GET',
    route: '/api/users',
    allows: 'admin'
  }, {
    method: ['POST', 'PUT', 'DELETE'],
    route: ['/api/users', '/api/stuff'],
    allows: 'admin'
  }, {
    method: ['POST', 'PUT', 'DELETE'],
    route: '/api/content',
    allows: ['user', 'admin']
  }]
}
```
