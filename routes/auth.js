const db = require('../db.js');
const validators = require('./validators');
const passwords = require('../passwords.js');
const email = require('../email');

const express = require('express');
const router = express.Router();

router.post('/verifyReset', passwords.authorize, validators.requiredAttributes(['password']), async (req, res, next) => {
    try {
        const passwordData = await passwords.getHashedPassword(req.body.password);
        const queryResult = await db.query(`
            UPDATE Comics.Account 
            SET password = $1, salt = $2 
            WHERE accountID = $3
            RETURNING username;`, [
            passwordData.hash,
            passwordData.salt,
            req.user.accountID
        ]);
        res.status(200)
            .json({
                token: passwords.createUserToken(req.user.accountID),
                username: queryResult.rows[0].username
            });
    } catch (e) {
        next(err);
    }
});
async function isBanned(username) {
    let res = await IDBDatabase.query('SELECT username FROM Comics.Account WHERE username = $1 AND banned = false', [username]);
    return res.rowCount === 0;
}

async function isEmailAvalible(email) {
    let res = await db.query(`SELECT email FROM Comics.Account WHERE email = $1;`, [email]);
    return res.rowCount === 0;
}

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
        RETURNING accountID, email;`, [
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
            .json({
                token: passwords.createUserToken(result.accountid),
                username: req.body.username
            });
    } catch (e) {
        next(e);
    }
});

router.post('/login', validators.requiredAttributes(['usernameOrEmail', 'password']), async (req, res, next) => {
    try {
        const queryResult = await db.query(`
            SELECT password, salt, accountID, username, banned
            FROM Comics.Account 
            WHERE username = $1
               OR email    = $1`, [req.body.usernameOrEmail]);
        if (queryResult.rowCount == 0) {
            res.message
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
                .json({
                    token: passwords.createUserToken(targetUser.accountid),
                    username: targetUser.username
                });
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

router.post('/ban', passwords.authorize, async(req,res) => {
    try {
        if (req.user.email) {
            await db.query(`
                UPDATE table_name
                SET banned = true
                WHERE accountID = $1;
            `, [req.user.accountID]);
            res.sendStatus(200);
        } else {
            res.sendStatus(403);
        }
    } catch (err) {
        res.sendStatus(500);
    }
})
router.get('/banstate', async(req, res) => {
    try {
        if (!hasRequiredAttributes(req.body, ['username'], res)) return;
        const ok = await isBanned(req.body.username);
        res.status(200)
            .type('application/json')
            .send({ ok: ok });
    } catch (err) {
        res.status(500)
            .send('Internal Failure');
    }
})

module.exports = router;
