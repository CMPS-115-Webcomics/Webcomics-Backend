'use strict';

const express = require('express');
const router = express.Router();
const {
    db
} = require('../models/db');
const validators = require('./validators');
const upload = require('../upload');
const tokens = require('../tokens');
const comicModel = require('../models/comic.model');

/*Get a list of all comics. */
router.get('/comics', async (req, res, next) => {
    try {
        const result = await comicModel.getAllComics;
        res.json(result);
    } catch (err) {
        next(err);
        return;
    }
});

/*Get a list of owned comics. */
router.get('/myComics', tokens.authorize, async (req, res, next) => {
    try {
        const result = await comicModel.getAllOwnedComics(req.user.accountID);
        res.json(result);
    } catch (err) {
        next(err);
        return;
    }
});

// comic insertion

/* Get a single comic from url */
router.get('/get/:comicURL', tokens.optionalAuthorize, async (req, res, next) => {
    try {
        const comicURL = req.params.comicURL;
        const comic = (typeof req.user !== 'undefined' ?
            comicModel.getOwnedComic(comicURL) : comicModel.getPublishedComic(comicURL));
        if (comic === -1) {
            res.status(400).send(`No comic with url ${comicURL}`);
            return;
        }
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
    validators.requiredAttributes(['title', 'comicURL', 'organization', 'tagline', 'description']),
    upload.resizeTo(375, 253),
    upload.sendUploadToGCS(false),
    async (req, res, next) => {
        if (!req.file || !req.file.fileKey) {
            res.status(400).send('No image uploaded');
            return;
        }
        try {
            const comicData = await comicModel.createComic({
                accountID: req.user.accountID,
                title: req.body.title,
                comicURL: req.body.comicURL,
                fileKey: req.file.fileKey,
                tagline: req.body.tagline,
                description: req.body.description,
                organization: req.body.organization
            });
            res.status(201)
                .json(comicData);
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
            await comicModel.addPage(
                req.body.pageNumber,
                req.body.comicID,
                req.body.altText || null,
                req.body.chapterID === 'null' ? null : req.body.chapterID,
                req.file.fileKey
            );
            res.status(201).json();
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
            const chapterData = await comicModel.addChapter(
                req.body.comicID,
                req.body.name || null,
                req.body.volumeID === 'null' ? null : req.body.volumeID,
                req.body.chapterNumber
            );
            res.status(201)
                .json(chapterData);
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
            const volumeData = await comicModel.addVolume(
                req.body.comicID,
                req.body.name || null,
                req.body.volumeNumber
            );
            res.status(201)
                .json(volumeData);
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
        const url = row.imgurl || row.thumbnailurl;
        upload.deleteFromGCS(url, row.imgurl !== undefined);
    }
};

//deletes the page's image via deleteImages and
//removes the page from the database
router.post('/deletePage',
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

//deletes all images associated with the chapter via deleteImages
//and removes the chapter and its contents from the database
router.post('/deleteChapter',
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

//deletes a volume's associated images with deleteImages and
//removes the volume and its contents from the database
router.post('/deleteVolume',
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

//deletes all images associated with the comic by using deleteImages
//and removes the comic and all its contents from the database
router.post('/deleteComic',
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

//updates a comic's metadata - includes titlem description, tagline, and publish status
router.put('/updateComic',
    tokens.authorize,
    validators.requiredAttributes(['comicID', 'title', 'description', 'tagline', 'published']),
    validators.canModifyComic,
    async (req, res, next) => {
        try {
            await db.query(`
                UPDATE Comics.Comic
                SET title = $1, description = $2, published = $3, tagline = $4
                WHERE comicID = $5
            `, [
                req.body.title,
                req.body.description,
                req.body.published,
                req.body.tagline,
                req.body.comicID
            ]);
            res.sendStatus(200);
        } catch (err) {
            next(err);
            return;
        }
    }
);

router.put('/updateThumbnail',
    tokens.authorize,
    upload.multer.single('thumbnail'),
    validators.requiredAttributes(['comicID']),
    validators.canModifyComic,
    upload.resizeTo(375, 253),
    upload.sendUploadToGCS(false),
    async (req, res, next) => {
        if (!req.file || !req.file.fileKey) {
            res.status(400).send('No image uploaded');
            return;
        }
        try {
            await db.query(`
                SELECT thumbnailURL 
                FROM Comics.Comics
                WHERE comicID = $1
            `, [req.body.comicID]);

            await db.query(`
                UPDATE Comics.Comic
                SET thumbnailURL = $1
                WHERE comicID    = $2`, [
                req.file.fileKey,
                req.body.comicID
            ]);
            res.sendStatus(200);
        } catch (err) {
            next(err);
            return;
        }
    }
);

router.put('/movePage',
    tokens.authorize,
    validators.requiredAttributes(['pageID, chapterID']),
    validators.canModifyComic,
    async (req, res, next) => {
        try {
            comicModel.movePage(
                req.body.pageID,
                req.body.chapterID
            );
            res.sendStatus(200);
        } catch (err) {
            next(err);
            return;
        }
    }
);

router.put('/moveChapter',
    tokens.authorize,
    validators.requiredAttributes(['chapterID, volumeID']),
    validators.canModifyComic,
    async (req, res, next) => {
        try {
            comicModel.moveChapter(
                req.body.chapterID,
                req.body.volumeID
            );
            res.sendStatus(200);
        } catch (err) {
            next(err);
            return;
        }
    }
);

module.exports = router;
