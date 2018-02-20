const express = require('express');
const app = express();
const router = express.Router();
const db = require('../db');
const validators = require('./validators');
const upload = require('../upload');
const passwords = require('../passwords');

/*Get a list of all comics. */
router.get('/comics', async function (req, res, next) {
    try {
        let result = await db.query(`
            SELECT comicID, accountID, title, comicURL, description, thumbnailURL 
            FROM Comics.Comic ORDER BY title`);
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

/*Get a list of owned comics. */
router.get('/myComics', passwords.authorize, async function (req, res, next) {
    try {
        let result = await db.query(`
            SELECT comicID, accountID, title, comicURL, description, thumbnailURL 
            FROM Comics.Comic
            WHERE accountID = $1
            ORDER BY title`, [req.user.accountID]);
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

// comic insertion

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
        next(err);
    }

});


//Generate a new comic and add it to the database
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
                INSERT INTO Comics.Comic 
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
            next(err);
        }
    }
);

//adds a new volume for a given comic to the database
router.post('/addVolume',
    passwords.authorize,
    validators.requiredAttributes(['comicID', 'volumeNumber']),
    validators.canModifyComic,
    async function (req, res, next) {
        try {
            let created = await db.query(`
                INSERT INTO Comics.Volume 
                (name, comicID, volumeNumber)
                VALUES ($1, $2, $3)
                RETURNING volumeID`, [
                req.body.name || null,
                req.body.comicID,
                req.body.volumeNumber
            ]);
            res.status(201)
                .json(created.rows[0]);
        } catch (err) {
            next(err);
        }
    }
);

//adds a new chapter for a given comic to the database
router.post('/addChapter',
    passwords.authorize,
    validators.requiredAttributes(['comicID', 'chapterNumber']),
    validators.canModifyComic,
    async function (req, res, next) {
        try {
            let chapterInsertion = await db.query(`
                INSERT INTO Comics.Chapter 
                (volumeID, name, comicID, chapterNumber)
                VALUES ($1, $2, $3, $4)
                RETURNING chapterID;`, [
                req.body.volumeID === 'null' ? null : req.body.volumeID,
                req.body.name || null,
                req.body.comicID,
                req.body.chapterNumber
            ]);

            res.status(201)
                .json(chapterInsertion.rows[0]);
        } catch (err) {
            next(err);
        }
    }
);

//adds a new page for a given comic to the database
router.post(
    '/addPage',
    passwords.authorize,
    upload.multer.single('file'),
    validators.requiredAttributes(['comicID', 'pageNumber']),
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
                req.body.altText || null,
                req.body.chapterID === 'null' ? null : req.body.chapterID,
                req.file.cloudStoragePublicUrl
            ]);

            res.status(201).json();
        } catch (err) {
            next(err);
        }
    }
);

// comic deletion

//deletes images from the cloud by using their URLs
function deleteImages(rows) {
    for (let row of rows) {
        let url = row.imgURL || row.thumbnailURL;
        let id = urls.split('/')[4];
        upload.deleteFromGCS(id);
    }
}

//deletes all images associated with the comic by using deleteImages
//and removes the comic and all its contents from the database
router.delete('/deleteComic',
    passwords.authorize,
    validators.requiredAttributes(['comicID']),
    validators.canModifyComic,
    async (req, res, next) => {
        try {
            let urlQuery = await db.query(`
                SELECT imgURL
                FROM Comics.Page
                WHERE comicID = $1`, [req.body.comicID]);

            deleteImages(urlQuery.rows);

            let thumbnailQuery = await db.query(`
                SELECT thumbnailURL
                FROM Comics.Comic
                WHERE comicID = $1`, [req.body.comicID]);

            deleteImages(thumbnailQuery.rows);

            await db.query(`
                DELETE FROM Comics.Comic
                WHERE comicID = $1`, [req.body.comicID]);

            res.status(200).send('Comic was deleted.');
        } catch (err) {
            next(err);
        }
    }
);

//deletes a volume's associated images with deleteImages and
//removes the volume and its contents from the database
router.delete('/deleteVolume',
    passwords.authorize,
    validators.requiredAttributes(['volumeID']),
    validators.canModifyComic,
    async (req, res, next) => {
        try {

            let volumeContentQuery = await db.query(`
                SELECT chapterID
                FROM Comics.Volume
                WHERE volumeID = $1`, [req.body.volumeID]);

            let urlQuery = await db.query(`
                SELECT imgURL
                FROM Comics.Page
                WHERE chapterID IN ($1)`, [volumeContentQuery.rows]);

            deleteImages(urlQuery.rows);

            await db.query(`
                DELETE FROM Comics.Volume
                WHERE volumeID = $1`, [req.body.volumeID]);
           
             res.status(200).send('Volume was deleted.');
        } catch (err) {
            next(err);
        }
    }
);

//deletes all images associated with the chapter via deleteImages
//and removes the chapter and its contents from the database
router.delete('/deleteChapter',
    passwords.authorize,
    validators.requiredAttributes(['chapterID']),
    validators.canModifyComic,
    async (req, res, next) => {
        try {
            let urlQuery = await db.query(`
                SELECT imgURL
                FROM Comics.Page
                WHERE chapterID = $1`, [req.body.chapterID]);

            deleteImages(urlQuery.rows);

            await db.query(`
                DELETE FROM Comics.Chapter
                WHERE chapterID = $1`, [req.body.chapterID]);
            
            res.status(200).send('Chapter was deleted.');
        } catch (err) {
            next(err);
        }
    }
);

//deletes the page's image via deleteImages and
//removes the page from the database
router.delete('/deletePage',
    passwords.authorize,
    validators.requiredAttributes(['pageID']),
    validators.canModifyComic,
    async (req, res, next) => {
        try {
            let urlQuery = await db.query(`
                SELECT imgURL
                FROM Comics.Page
                WHERE pageID = $1`, [req.body.pageID]);

            deleteImages(urlQuery.rows);

            await db.query(`
                DELETE FROM Comics.Page
                WHERE comicID = $1`, [req.body.pageID]);

            res.status(200).send('Page was deleted.');
        } catch (err) {
            next(err);
        }
    }
);


module.exports = router;