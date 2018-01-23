const {
  Pool,
  Client
} = require('pg');

const pool = new Pool();

module.exports = pool;

/*
  PGUSER=postgres \
  PGDATABASE=comics \
  npm start
  */