var express = require('express');
var router = express.Router();

/* Get a list of all comics. */
router.get('/', function(req, res, next) {
    res.json({ message: 'hooray! welcome to our api!' });   
});

/* Get a single comic */
router.get('/:id', function(req, res, next) {
    res.json({ message: 'hooray! welcome to our api!' });   
});

/* Generate a new comic */
router.post('/', function(req, res, next) {
    res.json({ message: 'hooray! welcome to our api!' });   
});

module.exports = router;
