const {
  Pool,
  Client
} = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: "localhost",
  database: 'comics',
  password:'postgres',
  port: 5432,
});




module.exports = pool;

/*
  PGUSER=postgres \
  PGDATABASE=comics \
  npm start
  */