'use strict';

const { Pool } = require('pg');
const config = require('./config');

if (config.INSTANCE_CONNECTION_NAME && config.enviroment === 'production') {
  config.database.host = `/cloudsql/${config.INSTANCE_CONNECTION_NAME}`;
}

module.exports = new Pool(config.database);
