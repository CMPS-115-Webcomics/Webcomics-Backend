const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const config = require('../config/config.json');
const { Pool } = require('pg');
var router = express.Router();

const pool = new Pool({
    user: config.SQL_USER,
    password: config.SQL_PASSWORD,
    host: config.PSQL_HOST,
    //host: "/cloudsql/" + config.INSTANCE_CONNECTION_NAME,
    database: config.SQL_DATABASE,
    port: 3306

});


/* Get a list of all comics. */
router.get('/list', function(req, res, next) {
    pool.connect((err, client, release) => {
        if (err) {
            return console.error("error acquiring client", err.stack);
        }
        client.query('SELECT NOW()', (err, result) => {
            release();
            if (err) {
                return console.error('Error executing query', err.stack);
            }
            console.log(result.rows);
        });
    });
    res.json({ message: 'test' });
});

/* Get a single comic */
router.get('/:id', function(req, res, next) {
    res.json({ message: 'hooray! welcome to our api!' });
});

/* Generate a new comic */
router.post('/create', function(req, res, next) {

    /*
    pg.connect(connectionString, function(err, client, done){
        if(err) {
        done();
        console.log(err);
    }
    client.query(
        'INSERT INTO Comics.Comic (accountID, title, comicURL, description)
        VALUES ($1, $2, $3, $4)', [
            req.user,
            req.body.title,
            req.body.url,
            req.body.description
        ]);
    */
    res.json({ message: req.body}); 
});

app.use('/', router);
module.exports = router;
