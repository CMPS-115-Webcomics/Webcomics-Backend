'use strict';
const express = require('express');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const cors = require('cors');

const index = require('./routes/index');
const auth = require('./routes/auth');
const comic = require('./routes/comic');
const message = require('./routes/message');
const availability = require('./routes/availability');

const app = express();

const whitelist = new Set([
  'http://localhost:4200',
  'https://comichub.io',
  'https://silent-thunder-192708.firebaseapp.com',
  undefined
]);
const corsOptions = {
  origin (origin, callback) {
    if (whitelist.has(origin)) {
      callback(null, true);
      return;
    } else {
      callback(new Error(`Origin "${origin}" not allowed by CORS`));
      return;
    }
  }
};

app.use(cors(corsOptions));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());

app.use('/', index);
app.use('/api/auth', auth);
app.use('/api/comics', comic);
app.use('/api/messages', message);
app.use('/api/availability', availability);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res) => {
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
