const db = require('../db.js');
const validators = require('./validators');
const passwords = require('../passwords.js');
const email = require('../email');

const express = require('express');
const router = express.Router();


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
                token: passwords.createUserToken(result.accountid)
            });
    } catch (e) {
        console.error(e);
        if (err.constraint) {
            res.status(400)
                .json({
                    errorType: 'constraint-error',
                    constraint: err.constraint
                });
            return;
        }
        res.status(500);
    }
});

router.post('/login', validators.requiredAttributes(['username', 'password']), async (req, res, next) => {
    try {
        const queryDB = await db.query('SELECT password, salt, accountID FROM Comics.Account WHERE username = $1;', [req.body.username]);
        if (queryDB.rowCount == 0) {
            res.status(400).send('User does not Exist');
            return;
        }
        const targetUser = queryDB.rows[0];
        if (await passwords.checkPassword(req.body.password, targetUser.password, targetUser.salt)) {
            res.status(200)
                .json({
                    token: passwords.createUserToken(targetUser.accountid)
                });
            return;
        }
        res.status(403).send('Password Incorrect');
    } catch (e) {
        console.error(e);
        res.status(500).send('Could not login user')
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
            res.status(200).json({message: 'done'});
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

module.exports = router;