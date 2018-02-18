var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var db = require('./db');

var cors = require('cors')

var index = require('./routes/index');
var users = require('./routes/users');
var auth = require('./routes/auth');
var comic = require('./routes/comic');
var message = require('./routes/message');
var availability = require('./routes/availability');

var app = express();

var whitelist = new Set([
  'http://localhost:4200', 
  'https://comichub.io', 
  'https://silent-thunder-192708.firebaseapp.com',
  undefined
]);
var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.has(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`Origin "${origin}" not allowed by CORS`))
    }
  }
}

app.use(cors(corsOptions));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());

app.use('/', index);
app.use('/api/users', users);
app.use('/api/auth', auth);
app.use('/api/comics', comic);
app.use('/api/messages', message);
app.use('/api/availability', availability);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.error(err);

  if (err.constraint) {
    res.status(400)
      .json({
        errorType: 'constraint-error',
        constraint: err.constraint
      });
    return;
  }

  res.sendStatus(err.status || 500);
});

module.exports = app;