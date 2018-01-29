const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const config = require('../config/config.json');
const { Pool } = require('pg');
var router = express.Router();

const pool = new Pool({
    user: config.SQL_USER,
    password: config.SQL_PASSWORD,
    host: config.SQL_HOST,
    //host: "/cloudsql/" + config.INSTANCE_CONNECTION_NAME,
    database: config.SQL_DATABASE,
    port: 3306

});


/*Get a list of all comics. */
router.get('/list', function(req, res, next) {
    pool.connect((err, client, release) => {
        if (err) {
            console.error("error acquiring client", err.stack);
            return;
        }
        client.query(`SELECT title, comicURL, description, thumbnailURL 
                      FROM Comics.Comic ORDER BY title`, (err, result) => {
            release();
            if (err) {
                console.error('Error executing query', err.stack);
                return;
            }
            res.status(200).json({data: result});
        });
    });
});

/* Get a single comic */
router.get('/:id', function(req, res, next) {
    pool.connect((err, client, release) => {
        if (err) {
            console.error('Error acquiring client', err.stack);
        }
        client.query(`SELECT chapterNumber, name
                      FROM Comics.Chapter
                      WHERE comicID = $1`, [req.params.id], (err, result) => {
            if (err) {
                console.error('Error executing query', err.stack);
                return;
            }
            res.status(200).json({data: result});
        });
    });
});

//Generate a new comic 
router.post('/create', function(req, res, next) {


    pool.connect((err, client, release) => {

        if (err) {
            console.error('Error acquiring client', err.stack);

        }
        client.query(`SELECT title FROM Comics.Comic
                      WHERE title=$1`, [req.body.title], (err, result) => {
            if (err) {
                console.error('Query for title failed', err.stack);

            } else if(result.rowCount > 0){
                console.error('Title is already taken');

            }
        });
        
        client.query(`SELECT comicURL FROM Comics.Comic
                      WHERE comicURL=$1`, [req.body.comicURL], (err, result)=>{
            if (err) {
                console.error('Query for comicURL failed', err.stack);
                
            }else if(result.rowCount > 0){
                console.error('Comic URL is already taken');
            }
        });

        //If any of the above fail, do not do this - TODO
        client.query(`INSERT INTO Comics.comic 
                      (accountID, title, comicURL, thumbnailURL, description)
                      VALUES ($1, $2, $3, $4, $5)`, [
           //req.user, //actual one to use
            req.body.user, //testing only
            req.body.title,
            req.body.comicURL,
            req.body.thumbnailURL,
            req.body.description
         ], (err, result) => {
            release();
            if (err) {
                console.error('Query cannot be executed', err.stack);
                res.json({message: 'Query has failed.'});
            }else{
                res.sendStatus(201);
            }  
        });
    });
});

app.use('/', router);
module.exports = router;
