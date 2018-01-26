var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.listen(4200);

var router = express.Router();

/* Get a list of all comics. */
router.get('/', function(req, res, next) {
    
});

/* Get a single comic */
router.get('/:id', function(req, res, next) {
    res.json({ message: 'hooray! welcome to our api!' });   
});

/* Generate a new comic */
router.post('/', function(req, res, next) {
    /*var comic = new Comic();
    comic.name = req.body.name;
    comic.desc = req.body.desc;

    comic.save(function(err){
        if (err){
            res.send(err);
        }
    })
    */
    res.json({ message: req.body}); 
});

app.use('/api', router);
module.exports = router;
