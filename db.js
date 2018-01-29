const {
  Pool,
  Client
} = require('pg');

let config = {
  user: process.env.SQL_USER || 'postgres',
  database: process.env.SQL_DATABASE || 'comics',
  password: process.env.SQL_PASSWORD || 'postgres'
};

if (process.env.INSTANCE_CONNECTION_NAME && process.env.NODE_ENV === 'production') {
  config.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
}

module.exports = new Pool(config);;
