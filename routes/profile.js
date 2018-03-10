'use strict';

const express = require('express');
const router = express.Router();
const { db } = require('../models/db');
const validators = require('./validators');
const tokens = require('../tokens');
const email = require('../email');


router.get('/myProfile', tokens.authorize, async (req, res, next) => {
    try {
        const userInfoQuery = await db.query(`
            SELECT username, email, biography, profileURL as url
            FROM Comics.Account 
            WHERE accountID = $1
        `, [req.user.accountID]);
        res.json(userInfoQuery.rows[0]);
    } catch (err) {
        next(err);
        return;
    }

});

// allows a user to view any person's enabled profile
router.get('/profiles/:profileURL', async (req, res, next) => {
    try {
        const userInfoQuery = await db.query(`
            SELECT username, biography, email, joined
            FROM Comics.Account 
            WHERE profileURL = $1
        `, [req.params.profileURL]);

        if (userInfoQuery.rowCount === 0) {
            res.status(400).send(`No profile with url${ req.params.profileURL}`);
            return;
        }

        const ownedComicsQuery = await db.query(`
            SELECT c.ComicID, c.title, c.comicURL, c.description, c.thumbnailURL
            FROM Comics.Comic c
            WHERE c.accountID = (SELECT a.accountID FROM Comics.Account a WHERE a.profileURL = $1)
        `, [req.params.profileURL]);

        res.json({user: userInfoQuery.rows[0], comics: ownedComicsQuery.rows});

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
                SET profileURL = $1
                WHERE accountID = $2
                  AND profileURL is NULL`, [
                    req.body.profileURL,
                    req.user.accountID
                ]
            );
            return res.sendStatus(200);
        } catch (err) {
            return next(err);
        }
    }
);

router.put('/updateEmail',
    tokens.authorize,
    validators.requiredAttributes(['email']),
    async (req, res, next) => {
        try {
            await db.query(`
                UPDATE Comics.Account
                SET email = $1, emailVerified = false
                WHERE accountID = $2`, [
                req.body.email,
                req.user.accountID]
            );
            email.sendVerificationEmail(req.body.email, req.user.accountID);
            res.sendStatus(200);
        } catch (err) {
            next(err);
            return;
        }
    }
);

router.put('/updateUsername',
    tokens.authorize,
    validators.requiredAttributes(['username']),
    async (req, res, next) => {
        try {
            await db.query(`
                UPDATE Comics.Account
                SET username = $1
                WHERE accountID = $2`, [
                req.body.username,
                req.user.accountID]
            );
            res.sendStatus(200);
        } catch (err) {
            next(err);
            return;
        }
    }
);

router.put('/updateBiography',
    tokens.authorize,
    validators.requiredAttributes(['biography']),
    async (req, res, next) => {
        try {
            await db.query(`
                UPDATE Comics.Account
                SET biography = $1
                WHERE accountID = $2`, [
                req.body.biography,
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
