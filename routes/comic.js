const express = require('express');
const app = express();
const router = express.Router();
const db = require('../db');
const validators = require('./validators');
const upload = require('../upload');
const passwords = require('../passwords');

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

/*Get a list of owned comics. */
router.get('/mycomics', passwords.authorize, async function (req, res, next) {
    try {
        let result = await db.query(`
            SELECT comicID, accountID, title, comicURL, description, thumbnailURL 
            FROM Comics.Comic
            WHERE accountID = $1
            ORDER BY title`, [req.user.accountID]);
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
            res.status(400).send('No comic with url' + req.params.comicURL);
            return;
        }

        let comic = comicQuery.rows[0];
        let comicID = comic.comicid;;

        let chapterQuery = await db.query(`
            SELECT *
            FROM Comics.Chapter
            WHERE comicID = $1
            ORDER BY chapterNumber`, [comicID]);
        comic.chapters = chapterQuery.rows;

        let volumeQuery = await db.query(`SELECT *
            FROM Comics.Volume
            WHERE comicID = $1
            ORDER BY volumeNumber`, [comicID]);
        comic.volumes = volumeQuery.rows;

        let pageQuery = await db.query(`SELECT *
            FROM Comics.Page
            WHERE comicID = $1
            ORDER BY pageNumber`, [comicID]);
        comic.pages = pageQuery.rows;

        res.json(comic);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }

});


//Generate a new comic 
router.post('/create',
    passwords.authorize,
    upload.multer.single('thumbnail'),
    validators.requiredAttributes(['title', 'comicURL', 'description']),
    upload.sendUploadToGCS,
    async function (req, res, next) {
        if (!req.file || !req.file.cloudStoragePublicUrl) {
            res.status(400).send('No image uploaded');
            return;
        }
        try {
            let created = await db.query(`
                INSERT INTO Comics.comic 
                (accountID, title, comicURL, thumbnailURL, description)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING comicID;
                `, [
                req.user.accountID,
                req.body.title,
                req.body.comicURL,
                req.file.cloudStoragePublicUrl,
                req.body.description
            ]);
            res.status(201)
                .json(created.rows[0]);
        } catch (err) {
            console.error(err);
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
    passwords.authorize,
    validators.requiredAttributes(['comicID']),
    validators.canModifyComic,
    async function (req, res, next) {
        try {
            let created = await db.query(`
                INSERT INTO Comics.Volume 
                (name, comicID)
                VALUES ($1)
                RETURNING volumeID`, [
                req.body.name || null,
                req.body.comicID
            ]);
            res.status(201)
                .json(created.rows[0]);
        } catch (err) {
            console.error(err);
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
    passwords.authorize,
    validators.requiredAttributes(['comicID']),
    validators.canModifyComic,
    async function (req, res, next) {
        try {
            let chapterInsertion = await db.query(`
                INSERT INTO Comics.Chapter 
                (volumeID, name, comicID)
                VALUES ($1, $2, $3)
                RETURNING chapterID;`, [
                req.body.volumeID === 'null' ? null : req.body.volumeID,
                req.body.name || null,
                req.body.comicID
            ]);

            res.status(201)
                .json(chapterInsertion.rows[0]);
        } catch (err) {
            console.error(err);
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

router.post(
    '/addPage',
    passwords.authorize,
    upload.multer.single('file'),
    validators.requiredAttributes(['comicID', 'altText']),
    validators.canModifyComic,
    upload.sendUploadToGCS,
    async (req, res, next) => {
        if (!req.file || !req.file.cloudStoragePublicUrl) {
            res.status(400).send('No image uploaded');
            return;
        }
        try {
            await db.query(`
                INSERT INTO Comics.Page 
                (pageNumber, comicID, altText, chapterID, imgUrl)
                VALUES ($1, $2, $3, $4, $5)`, [
                req.body.pageNumber,
                req.body.comicID,
                req.body.altText,
                req.body.chapterID === 'null' ? null : req.body.chapterID,
                req.file.cloudStoragePublicUrl
            ]);

            res.status(201).json();
        } catch (err) {
            console.error(err);
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
    }
);



module.exports = router;