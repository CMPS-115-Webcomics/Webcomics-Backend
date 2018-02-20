const db = require('../db');
const validators = require('./validators');
const passwords = require('../passwords.js');
const email = require('../email');

const express = require('express');
const router = express.Router();

function authResponce(accountID, role, username) {
    return {
        token: passwords.createUserToken(accountID, role),
        username: username,
        role: role,
    };
}

async function isBanned(username) {
    let res = await IDBDatabase.query('SELECT username FROM Comics.Account WHERE username = $1 AND banned = false', [username]);
    return res.rowCount === 0;
}

async function isEmailAvalible(email) {
    let res = await db.query(`SELECT email FROM Comics.Account WHERE email = $1;`, [email]);
    return res.rowCount === 0;
}

router.post('/verifyReset', passwords.authorize, validators.requiredAttributes(['password']), async (req, res, next) => {
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
        let targetUser = queryResult.rows[0];
        res.status(200)
            .json(authResponce(targetUser.accountid, targetUser.role, targetUser.username));
    } catch (e) {
        next(err);
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
        let result = queryResult.rows[0];
        email.sendPasswordResetEmail(result.email, result.accountid);
        res.json({
            message: 'Reset email sent'
        });
    } catch (err) {
        next(err);
    }
});

router.post('/register', validators.requiredAttributes(['username', 'email', 'password']), async (req, res, next) => {
    try {
        const passwordData = await passwords.getHashedPassword(req.body.password);
        const queryResult = await db.query(`
        INSERT INTO Comics.Account (
            username,
            profileURL,
            email,
            biography,
            password,
            salt
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING accountID, role, email;`, [
            req.body.username,
            req.body.profileURL,
            req.body.email.toLowerCase(),
            '',
            passwordData.hash,
            passwordData.salt
        ]);
        let result = queryResult.rows[0];
        email.sendVerificationEmail(result.email, result.accountid);
        res.status(201)
            .json(authResponce(result.accountid, result.role, req.body.username));
    } catch (e) {
        next(e);
    }
});

router.post('/login', validators.requiredAttributes(['usernameOrEmail', 'password']), async (req, res, next) => {
    try {
        const queryResult = await db.query(`
            SELECT password, salt, accountID, username, role, banned
            FROM Comics.Account 
            WHERE username = $1
               OR email    = $1`, [req.body.usernameOrEmail]);
        if (queryResult.rowCount == 0) {
            res.message;
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
    }
});

router.post('/verifyEmail', passwords.authorize, async (req, res, next) => {
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
    }
});


router.get('/testAuth', passwords.authorize, async (req, res) => {
    res.json(req.user);
});

router.post('/ban',
    passwords.authorize,
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