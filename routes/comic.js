'use strict';

const express = require('express');
const router = express.Router();
const { db } = require('../models/db');
const validators = require('./validators');
const upload = require('../upload');
const tokens = require('../tokens');

/*Get a list of all comics. */
router.get('/comics', async (req, res, next) => {
    try {
        const result = await db.query(`
            SELECT comicID, accountID, title, comicURL, tagline, description, thumbnailURL 
            FROM Comics.Comic ORDER BY title`);
        res.json(result.rows);
    } catch (err) {
        next(err);
        return;
    }
});

/*Get a list of owned comics. */
router.get('/myComics', tokens.authorize, async (req, res, next) => {
    try {
        const result = await db.query(`
            SELECT comicID, accountID, title, comicURL, tagline, description, thumbnailURL 
            FROM Comics.Comic
            WHERE accountID = $1
            ORDER BY title`, [req.user.accountID]);
        res.json(result.rows);
    } catch (err) {
        next(err);
        return;
    }
});

// comic insertion

/* Get a single comic from url */
router.get('/get/:comicURL', async (req, res, next) => {
    try {
        const comicQuery = await db.query('SELECT * FROM Comics.Comic WHERE comicURL = $1', [req.params.comicURL]);

        if (comicQuery.rowCount === 0) {
            res.status(400).send(`No comic with url${ req.params.comicURL}`);
            return;
        }

        const comic = comicQuery.rows[0];
        const comicID = comic.comicid;

        comic.chapters = (await db.query(`
            SELECT *
            FROM Comics.Chapter
            WHERE comicID = $1
            ORDER BY chapterNumber`, [comicID])).rows;

        comic.volumes = (await db.query(`SELECT *
            FROM Comics.Volume
            WHERE comicID = $1
            ORDER BY volumeNumber`, [comicID])).rows;

        comic.pages = (await db.query(`SELECT *
            FROM Comics.Page
            WHERE comicID = $1
            ORDER BY pageNumber`, [comicID]))
            .rows;

        res.json(comic);
    } catch (err) {
        next(err);
        return;
    }

});


//Generate a new comic and add it to the database
router.post('/create',
    tokens.authorize,
    upload.multer.single('thumbnail'),
    validators.requiredAttributes(['title', 'comicURL', 'tagline', 'description']),
    upload.resizeTo(375, 253),
    upload.sendUploadToGCS(false),
    async (req, res, next) => {
        if (!req.file || !req.file.fileKey) {
            res.status(400).send('No image uploaded');
            return;
        }
        try {
            const created = await db.query(`
                INSERT INTO Comics.Comic 
                (accountID, title, comicURL, thumbnailURL, tagline, description)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING comicID;
                `, [
                req.user.accountID,
                req.body.title,
                req.body.comicURL,
                req.file.fileKey,
                req.body.tagline,
                req.body.description
            ]);
            res.status(201)
                .json(created.rows[0]);
        } catch (err) {
            next(err);
            return;
        }
    }
);

//adds a new volume for a given comic to the database
router.post('/addVolume',
    tokens.authorize,
    validators.requiredAttributes(['comicID', 'volumeNumber']),
    validators.canModifyComic,
    async (req, res, next) => {
        try {
            const created = await db.query(`
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
            return;
        }
    }
);

//adds a new chapter for a given comic to the database
router.post('/addChapter',
    tokens.authorize,
    validators.requiredAttributes(['comicID', 'chapterNumber']),
    validators.canModifyComic,
    async (req, res, next) => {
        try {
            const chapterInsertion = await db.query(`
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
            return;
        }
    }
);

//adds a new page for a given comic to the database
router.post(
    '/addPage',
    tokens.authorize,
    upload.multer.single('file'),
    validators.requiredAttributes(['comicID', 'pageNumber']),
    validators.canModifyComic,
    upload.sendUploadToGCS(true),
    async (req, res, next) => {
        if (!req.file || !req.file.fileKey) {
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
                req.file.fileKey
            ]);

            res.status(201).json();
        } catch (err) {
            next(err);
            return;
        }
    }
);

// comic deletion

//deletes images from the cloud by using their URLs
const deleteImages = rows => {
    for (const row of rows) {
        const url = row.imgURL || row.thumbnailURL;
        const id = url.split('/')[4];
        upload.deleteFromGCS(id);
    }
};

//deletes all images associated with the comic by using deleteImages
//and removes the comic and all its contents from the database
router.delete('/deleteComic',
    tokens.authorize,
    validators.requiredAttributes(['comicID']),
    validators.canModifyComic,
    async (req, res, next) => {
        try {
            const urlQuery = await db.query(`
                SELECT imgURL
                FROM Comics.Page
                WHERE comicID = $1`, [req.body.comicID]);

            deleteImages(urlQuery.rows);

            const thumbnailQuery = await db.query(`
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
            return;
        }
    }
);

//deletes a volume's associated images with deleteImages and
//removes the volume and its contents from the database
router.delete('/deleteVolume',
    tokens.authorize,
    validators.requiredAttributes(['volumeID']),
    validators.canModifyComic,
    async (req, res, next) => {
        try {
            const urlQuery = await db.query(`
                SELECT p.imgURL
                FROM Comics.Page p
                WHERE p.chapterID IN (
                    SELECT c.chapterID
                    FROM Comics.Chapter c
                    WHERE c.volumeID = $1
                );`, [req.body.volumeID]);

            deleteImages(urlQuery.rows);

            await db.query(`
                DELETE FROM Comics.Volume
                WHERE volumeID = $1`, [req.body.volumeID]);

            res.status(200).send('Volume was deleted.');
        } catch (err) {
            next(err);
            return;
        }
    }
);

//deletes all images associated with the chapter via deleteImages
//and removes the chapter and its contents from the database
router.delete('/deleteChapter',
    tokens.authorize,
    validators.requiredAttributes(['chapterID']),
    validators.canModifyComic,
    async (req, res, next) => {
        try {
            const urlQuery = await db.query(`
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
            return;
        }
    }
);

//deletes the page's image via deleteImages and
//removes the page from the database
router.delete('/deletePage',
    tokens.authorize,
    validators.requiredAttributes(['pageID']),
    validators.canModifyComic,
    async (req, res, next) => {
        try {
            const urlQuery = await db.query(`
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
            return;
        }
    }
);

module.exports = router;
