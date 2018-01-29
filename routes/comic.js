const express = require('express');
const app = express();
const router = express.Router();
const db = require('../db');
const validators = require('./validators');

/*Get a list of all comics. */
router.get('/list', async function (req, res, next) {
    try {
        let result = await db.query(`
            SELECT comicID, accountID, title, comicURL, description, thumbnailURL 
            FROM Comics.Comic ORDER BY title`);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

/* Get a single comic from url */
router.get('/get/:comicURL', async function (req, res, next) {
    try {
        let comicQuery = await db.query('SELECT * FROM Comics.Comic WHERE comicURL = $1', [req.params.comicURL]);

        if (comicQuery.rowCount === 0) {
            res.status(400).send('No comic with url', req.params.comicURL);
            return;
        }

        let comic = comicQuery.rows[0];
        let comicID = comic.comicid;;

        let chapterQuery = await db.query(`
            SELECT *
            FROM Comics.Chapter
            WHERE comicID = $1`, [comicID]);
        comic.chapters = chapterQuery.rows;

        let volumeQuery = await db.query(`SELECT *
            FROM Comics.Volume
            WHERE comicID = $1`, [comicID]);
        comic.volumes = volumeQuery.rows;

        let pageQuery = await db.query(`SELECT *
            FROM Comics.Page
            WHERE comicID = $1`);
        comic.pages = result.rows;

        res.json(comic);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }

});


// Check if unique attributes are avilible
router.get('/titleAvailble/:title', validators.availibilityRoute('Comic', 'title'));
router.get('/urlAvilbible/:comicURL', validators.availibilityRoute('Comic', 'comicURL'));

//Generate a new comic 
router.post('/create',
    validators.requiredAttributes(['title', 'comicURL', 'thumbnailURL', 'description']),
    async function (req, res, next) {
        try {
            await db.query(`
        INSERT INTO Comics.comic 
        (accountID, title, comicURL, thumbnailURL, description)
        VALUES ($1, $2, $3, $4, $5)`, [
                req.body.userID, //testing only
                req.body.title,
                req.body.comicURL,
                req.body.thumbnailURL,
                req.body.description
            ]);
            res.sendStatus(201);
        } catch (err) {
            console.log(err);
            if (err.constraint && err.table) {
                res.status(400)
                    .json({
                        errorType: 'non-unique-value',
                        attribute: err.constraint
                    });
                return;
            }
            res.sendStatus(500);
        }
    });

router.post('/addVolume',
    validators.requiredAttributes(['comicID']),
    async function (req, res, next) {
        try {
            await db.query(`
                INSERT INTO Comics.Volume 
                (name, comicID)
                VALUES ($1)`, [
                req.body.name || null,
                req.body.comicID
            ]);
            res.sendStatus(201);
        } catch (err) {
            console.log(err);
            if (err.constraint) {
                res.status(400)
                    .json({
                        errorType: 'constraint-error',
                        constraint: err.constraint
                    });
                return;
            }
            res.sendStatus(500);
        }
    });


router.post('/addChapter',
    validators.requiredAttributes(['comicID']),
    async function (req, res, next) {
        try {
            await db.query(`
                INSERT INTO Comics.Chapter 
                (volumeID, name, comicID)
                VALUES ($1, $2, $3)`, [
                req.body.volumeID || null,
                req.body.name || null,
                req.body.comicID
            ]);
            res.sendStatus(201);
        } catch (err) {
            console.log(err);
            if (err.constraint) {
                res.status(400)
                    .json({
                        errorType: 'constraint-error',
                        constraint: err.constraint
                    });
                return;
            }
            res.sendStatus(500);
        }
    });

router.post('/addPage',
    validators.requiredAttributes(['comicID']),
    async function (req, res, next) {
        try {
            await db.query(`
                INSERT INTO Comics.Chapter 
                (volumeID, name, comicID)
                VALUES ($1, $2, $3)`, [
                req.body.volumeID || null,
                req.body.name || null,
                req.body.comicID
            ]);
            res.sendStatus(201);
        } catch (err) {
            console.log(err);
            if (err.constraint) {
                res.status(400)
                    .json({
                        errorType: 'constraint-error',
                        constraint: err.constraint
                    });
                return;
            }
            res.sendStatus(500);
        }
    });


module.exports = router;