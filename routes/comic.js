const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const pg = require('pg');
const config = require('./config.json');

var connection = new pg(config);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.listen(4200);

var router = express.Router();

/* Get a list of all comics. */
router.get('/comic/list', function(req, res, next) {
    //var list = client.query('SELECT title FROM Comics.CSomic ORDER BY title');
    //res.json({message: list});
    res.json({ message: 'test' });
});

/* Get a single comic */
router.get('/:id', function(req, res, next) {
    res.json({ message: 'hooray! welcome to our api!' });   
});

/* Generate a new comic */
router.post('/api/comic/create', function(req, res, next) {

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
