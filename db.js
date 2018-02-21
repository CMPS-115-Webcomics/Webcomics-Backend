'use strict';

const { Pool } = require('pg');
const config = require('./config');
const fs = require('fs');

if (config.INSTANCE_CONNECTION_NAME && config.enviroment === 'production') {
  config.database.host = `/cloudsql/${config.INSTANCE_CONNECTION_NAME}`;
}

const db = new Pool(config.database);

const getFile = (fileName, type) => {
  return new Promise((resolve, reject) => {
    fs.readFile(fileName, type, (err, data) => {
        if (err) reject(err);
        resolve(data);
    });
  });
};

const startDB = async () => {
  try {
    const existQuery = await db.query(`SELECT EXISTS (
      SELECT 1
      FROM   information_schema.tables 
      WHERE  table_schema = 'comics'
    );`);
    if (!existQuery.rows[0].exists) {
      console.log('No Comics Schema detected. Creating now.');
      const sql = await getFile('./sql/makeDB.sql', 'utf8');
      await db.query(sql);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Could not connect to postgres database. Please be sure the server is running.');
    console.error('You may also need to set the SQL_USER, SQL_DATABASE and SQL_PASSWORD variables in config/config.json.');
    console.error('For more details read https://node-postgres.com/features/connecting');
    throw e;
  }
};

module.exports = {
  db,
  startDB
};


