'use strict';

const express = require('express');
const router = express.Router();
const { db } = require('../models/db');
const validators = require('./validators');
const tokens = require('../tokens');

// allows a user to view any person's enabled profile
router.get('/profiles/:profileURL', async (req, res, next) => {
    try {

        const userInfoQuery = db.query(`
            SELECT username, biography, joined
            FROM Comics.Account 
            WHERE profileURL = $1
        `, [req.params.profileURL]);

        if (userInfoQuery.rowCount === 0) {
            res.status(400).send(`No profile with url${ req.params.profileURL}`);
            return;
        }

        const ownedComicsQuery = db.query(`
            SELECT c.ComicID, c.title, c.comicURL, c.description, c.thumbnailURL
            FROM Comics.Comic c
            WHERE c.accountID = (SELECT a.accountID FROM Comics.Account a WHERE a.profileURL = $1)
        `, [req.params.profileURL]);

        res.json({user: userInfoQuery.rows, comics: ownedComicsQuery.rows});

    } catch (err) {
        next(err);
        return;
    }

});

router.put('/enableProfile',
    tokens.authorize,
    validators.requiredAttributes(['profileURL']),
    async (req, res, next) => {
        try {
            await db.query(`
                UPDATE Comics.Account
                SET profileURL = $1, biography = $2
                WHERE accountID = $3`, [
                    req.body.profileURL,
                    req.body.biography || null,
                    req.user.accountID
                ]
            );
            res.sendStatus(200);
        } catch (err) {
            next(err);
            return;
        }
    }
);

router.put('/editProfile',
    tokens.authorize,
    validators.requiredAttributes(['username']),
    async (req, res, next) => {
        try {
            await db.query(`
                UPDATE Comics.Account
                SET username = $1, biography = $2
                WHERE accountID = $3`, [
                req.body.username,
                req.body.biography || null,
                req.user.accountID]
            );
            res.sendStatus(200);
        } catch (err) {
            next(err);
            return;
        }
    }
);

module.exports = router;
