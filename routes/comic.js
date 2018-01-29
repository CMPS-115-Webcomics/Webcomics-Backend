const express = require('express');
const app = express();
const config = require('../config/config.json');
const { Pool } = require('pg');
var router = express.Router();
const async = require('async');


const pool = new Pool({
    user: config.DEVELOPMENT.SQL_USER,
    password: config.DEVELOPMENT.SQL_PASS,
    host: config.DEVELOPMENT.SQL_HOST,
    //host: "/cloudsql/" + config.INSTANCE_CONNECTION_NAME,
    database: config.DEVELOPMENT.SQL_DB,
    port: config.DEVELOPMENT.SQL_PORT
});


/*Get a list of all comics. */
router.get('/list', function(req, res, next) {
    async.waterfall([
        function(callback) {
            pool.connect((err, client, release) => {
                if (err) {
                    console.error("error acquiring client", err.stack);
                    callback(err);
                } else {
                    callback(null, client, release);
                }
            });
        },
        function(client, release, callback) {
            client.query(`SELECT comicID, accountID, title, comicURL, description, thumbnailURL 
                          FROM Comics.Comic ORDER BY title`, (err, result) => {
            //client.query('SELECT * FROM comics.account', (err, result) => {
                if (err) {
                    release();
                    console.error('Error executing query', err.stack);
                    callback(err);
                } else {
                    release();
                    callback(null, result);
                }
            });
        },
    ],
    function(err, results) {
        if (err) {
            res.send(err);
        } else {
            //res.status(200).json({data: result});
            res.send(results.rows);
        }
    });
});

/* Get a single comic from url */
router.get('/comicURL/:comicURL', function(req, res, next) {
    async.waterfall([
        function(callback) {
            pool.connect((err, client, release) => {
                if (err) {
                    console.error('Error acquiring client', err.stack);
                    callback(err);
                } else {
                    callback(null, client, release);
                }
            });
        },
        function(client, release, callback) {
            client.query('SELECT * FROM Comics.Comic WHERE comicURL = $1',[req.params.comicURL], (err, result) => {
                if (err) {
                    release();
                    console.error('Error executing query', err.stack);
                    callback(err);
                } else {
                    var data = result.rows[0];
                    callback(null, client, release, data);
                }
            });
        },
        function(client, release, data, callback) {
            client.query(`SELECT *
                          FROM Comics.Chapter
                          WHERE comicID = $1`, [req.params.id], (err, result) => {
                if (err) {
                    release();
                    console.error(err.stack);
                    callback(err);
                } else {
                    data['chapters'] = result.rows;
                    callback(null, client, release, data);
                }
            });
        },
        function(client, release, data, callback) {
            client.query(`SELECT *
                          FROM Comics.Volume
                          WHERE comicID = $1`, [req.params.id], (err, result) => {
                if (err) {
                    release();
                    console.error(err.stack);
                    callback(err);
                } else {
                    data['volumes'] = result.rows;
                    callback(null, client, release, data);
                }
            });
        },
        function(client, release, data, callback) {
            client.query(`SELECT *
                          FROM Comics.Page
                          WHERE comicID = $1`, [req.params.id], (err, result) => {
                if (err) {
                    release();
                    console.error(err.stack);
                    callback(err);
                } else {
                    release();
                    data['pages'] = result.rows;
                    callback(null, data);
                }
            });
        },
    ],
    function(err, results) {
        if (err) {
            res.send(err);
        } else {
            res.status(200).send(results);
        }
    });
});

//Generate a new comic 
router.post('/create', function(req, res, next) {
    async.waterfall([
        function(callback) {
            pool.connect((err, client, release) => {
                if (err) {
                    console.error('Error acquiring client', err.stack);
                    callback(err);
                } else {
                    callback(null, client, release);
                }
            });
        },
        function(client, release, callback) {
            client.query(`SELECT title FROM Comics.Comic WHERE title=$1`, [req.body.title], (err, result) => {
                if (err) {
                    release();
                    console.error('Query for title failed', err.stack);
                    callback(err);
                } else if (result.rowCount > 0){
                    release();
                    var msg = 'Title is already taken';
                    console.error(msg);
                    callback(msg);
                } else {
                    callback(null, client, release);
                }
            });
        },
        function(client, release, callback) {
            client.query(`SELECT comicURL FROM Comics.Comic
                          WHERE comicURL=$1`, [req.body.comicURL], (err, result) => {
                if (err) {
                    release();
                    console.error('Query for comicURL failed', err.stack);
                    callback(err)
                } else if (result.rowCount > 0){
                    release();
                    var msg = 'Comic URL is already taken';
                    console.error(msg);
                    callback(msg);
                } else {
                    callback(null, client, release);
                }
            });
        },
        function(client, release, callback) {
            client.query(`INSERT INTO Comics.comic 
                          (accountID, title, comicURL, thumbnailURL, description)
                          VALUES ($1, $2, $3, $4, $5)`, [
               //req.user, //actual one to use
                req.body.userID, //testing only
                req.body.title,
                req.body.comicURL,
                req.body.thumbnailURL,
                req.body.description
             ], (err, result) => {
                release();
                if (err) {
                    console.error('Query cannot be executed', err.stack);
                    callback(err);
                } else {
                    callback(null, result);
                }
             });
        }
    ],
    function(err, results) {
        if (err) {
            res.send(err);
        } else {
            res.send(results);
        }
    });
});

/* Get a single comic */
router.get('/id/:id', function(req, res, next) {
    async.waterfall([
        function(callback) {
            pool.connect((err, client, release) => {
                if (err) {
                    console.error('Error acquiring client', err.stack);
                    callback(err);
                } else {
                    callback(null, client, release);
                }
            });
        },
        function(client, release, callback) {
            client.query('SELECT * FROM Comics.Comic WHERE comicID = $1',[req.params.id], (err, result) => {
                if (err) {
                    release();
                    console.error('Error executing query', err.stack);
                    callback(err);
                } else {
                    var data = result.rows[0];
                    callback(null, client, release, data);
                }
            });
        },
        function(client, release, data, callback) {
            client.query(`SELECT *
                          FROM Comics.Chapter
                          WHERE comicID = $1`, [req.params.id], (err, result) => {
                if (err) {
                    release();
                    console.error(err.stack);
                    callback(err);
                } else {
                    data['chapters'] = result.rows;
                    callback(null, client, release, data);
                }
            });
        },
        function(client, release, data, callback) {
            client.query(`SELECT *
                          FROM Comics.Volume
                          WHERE comicID = $1`, [req.params.id], (err, result) => {
                if (err) {
                    release();
                    console.error(err.stack);
                    callback(err);
                } else {
                    data['volumes'] = result.rows;
                    callback(null, client, release, data);
                }
            });
        },
        function(client, release, data, callback) {
            client.query(`SELECT *
                          FROM Comics.Page
                          WHERE comicID = $1`, [req.params.id], (err, result) => {
                if (err) {
                    release();
                    console.error(err.stack);
                    callback(err);
                } else {
                    release();
                    data['pages'] = result.rows;
                    callback(null, data);
                }
            });
        },
    ],
    function(err, results) {
        if (err) {
            res.send(err);
        } else {
            res.status(200).send(results);
        }
    });
});

//Generate a new comic 
router.post('/create', function(req, res, next) {
    async.waterfall([
        function(callback) {
            pool.connect((err, client, release) => {
                if (err) {
                    console.error('Error acquiring client', err.stack);
                    callback(err);
                } else {
                    callback(null, client, release);
                }
            });
        },
        function(client, release, callback) {
            client.query(`SELECT title FROM Comics.Comic WHERE title=$1`, [req.body.title], (err, result) => {
                if (err) {
                    release();
                    console.error('Query for title failed', err.stack);
                    callback(err);
                } else if (result.rowCount > 0){
                    release();
                    var msg = 'Title is already taken';
                    console.error(msg);
                    callback(msg);
                } else {
                    callback(null, client, release);
                }
            });
        },
        function(client, release, callback) {
            client.query(`SELECT comicURL FROM Comics.Comic
                          WHERE comicURL=$1`, [req.body.comicURL], (err, result) => {
                if (err) {
                    release();
                    console.error('Query for comicURL failed', err.stack);
                    callback(err)
                } else if (result.rowCount > 0){
                    release();
                    var msg = 'Comic URL is already taken';
                    console.error(msg);
                    callback(msg);
                } else {
                    callback(null, client, release);
                }
            });
        },
        function(client, release, callback) {
            client.query(`INSERT INTO Comics.comic 
                          (accountID, title, comicURL, thumbnailURL, description)
                          VALUES ($1, $2, $3, $4, $5)`, 
            [
                req.body.userID, //testing only
                req.body.title,
                req.body.comicURL,
                req.body.thumbnailURL,
                req.body.description
             ], (err, result) => {
                release();
                if (err) {
                    console.error('Query cannot be executed', err.stack);
                    callback(err);
                } else {
                    callback(null, result);
                }
             });
        }
    ],
    function(err, results) {
        if (err) {
            res.send(err);
        } else {
            res.send(results);
        }
    });
});

module.exports = router;
