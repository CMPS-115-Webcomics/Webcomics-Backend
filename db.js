const {
  Pool,
  Client
} = require('pg');

const pool = new Pool();

module.exports = {
  query: pool.query
}

/*
  PGUSER=postgres \
  PGDATABASE=comics \
  npm start
  */