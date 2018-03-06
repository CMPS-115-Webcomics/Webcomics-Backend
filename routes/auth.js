'use strict';

const { db } = require('../models/db');
const validators = require('./validators');
const passwords = require('../models/passwords');
const tokens = require('../tokens');
const email = require('../email');
const users = require('../models/users');

const express = require('express');
const router = express.Router();

/**
 * Produces the results of a sucesful authorzation such as logging in or registering
 *
 * @param {number} accountID Id of account that logged in
 * @param {string} role Role of the user
 * @param {string} username Name of th user
 * @returns {{token: string, role:string, username:string}}} a
 */
const authResponce = (accountID, role, username) => {
    return {
        token: tokens.createUserToken(accountID, role),
        username,
        role
    };
};

/**
 * Checks if a user  is banned
 *
 * @param {string} username The username to check
 * @returns {Promise<Boolean>} A promise that tells if a user is banned
 */
const isBanned = async username => {
    const res = await db.query('SELECT username FROM Comics.Account WHERE username = $1 AND banned = false', [username]);
    return res.rowCount === 0;
};


router.post('/verifyReset', tokens.authorize, validators.requiredAttributes(['password']), async (req, res, next) => {
    try {
        const passwordData = await passwords.getHashedPassword(req.body.password);
        const queryResult = await db.query(`
            UPDATE Comics.Account 
            SET password = $1, salt = $2 
            WHERE accountID = $3
            RETURNING accountId, username, role;`, [
            passwordData.hash,
            passwordData.salt,
            req.user.accountID
        ]);
        const targetUser = queryResult.rows[0];
        res.status(200)
            .json(authResponce(targetUser.accountid, targetUser.role, targetUser.username));
    } catch (err) {
        next(err);
        return;
    }
});

router.post('/requestReset', validators.requiredAttributes(['usernameOrEmail']), async (req, res, next) => {
    try {
        const queryResult = await db.query(`
            SELECT email, accountID 
            FROM Comics.Account 
            WHERE username = $1
               OR email    = $1`, [req.body.usernameOrEmail]);
        if (queryResult.rowCount === 0) {
            res.status(400)
                .json({
                    account: req.body.usernameOrEmail,
                    message: 'No such account'
                });
            return;
        }
        const result = queryResult.rows[0];
        email.sendPasswordResetEmail(result.email, result.accountid);
        res.json({
            message: 'Reset email sent'
        });
    } catch (err) {
        next(err);
        return;
    }
});

router.post('/register', validators.requiredAttributes(['username', 'email', 'password']), async (req, res, next) => {
    try {
        const authData = await users.create(req.body, 'user');
        res.status(201)
            .json(authData);
    } catch (e) {
        next(e);
        return;
    }
});

router.post('/login', validators.requiredAttributes(['usernameOrEmail', 'password']), async (req, res, next) => {
    try {
        const queryResult = await db.query(`
            SELECT password, salt, accountID, username, role, banned
            FROM Comics.Account 
            WHERE username = $1
               OR email    = $1`, [req.body.usernameOrEmail]);
        if (queryResult.rowCount === 0) {
            res.status(400).send('No such account');
            return;
        }
        const targetUser = queryResult.rows[0];
        if (targetUser.banned) {
            res.status(403)
                .send('The account has been banned');
            return;
        }
        if (await passwords.checkPassword(req.body.password, targetUser.password, targetUser.salt)) {
            res.status(200)
                .json(authResponce(targetUser.accountid, targetUser.role, targetUser.username));
            return;
        }
        res.status(403).send('Password Incorrect');
    } catch (e) {
        next(e);
        return;
    }
});

router.post('/verifyEmail', tokens.authorize, async (req, res, next) => {
    try {
        if (req.user.email && req.user.accountID) {
            await db.query(`
                UPDATE Comics.Account
                SET emailVerified = true
                WHERE accountID = $1;
            `, [req.user.accountID]);
            res.status(200).json({
                message: 'done'
            });
        } else {
            res.sendStatus(403);
        }
    } catch (err) {
        next(err);
        return;
    }
});


router.get('/testAuth', tokens.authorize, async (req, res) => {
    res.json(req.user);
});

router.post('/ban',
    tokens.authorize,
    validators.isMod,
    validators.requiredAttributes(['accountID']),
    async (req, res) => {
        try {
            await db.query(`
            UPDATE Comics.Account
            SET banned = true
            WHERE accountID = $1;
        `, [req.body.accountID]);
            res.sendStatus(200);
        } catch (err) {
            res.sendStatus(500);
        }
    });

router.get('/banstate', validators.requiredAttributes(['username']), async (req, res) => {
    try {
        res.status(200)
            .type('application/json')
            .send({
                banned: await isBanned(req.body.username)
            });
    } catch (err) {
        res.status(500)
            .send('Internal Failure');
    }
});

module.exports = router;
