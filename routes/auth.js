const db = require('../db.js');
const passwords = require('../passwords.js');
const express = require('express');
const router = express.Router();

async function isUsernameAvalible(username) {
    let res = await db.query(`SELECT username FROM Comics.Account WHERE username = $1;`, [username]);
    return res.rowCount === 0;
}

async function isEmailAvalible(email) {
    let res = await db.query(`SELECT email FROM Comics.Account WHERE email = $1;`, [email]);
    return res.rowCount === 0;
}

function hasRequiredAttributes(body, params, res) {
    let missing = [];
    for (let param of params) {
        if (body[param] === undefined) {
            missing.push(param);
        }
    }
    if (missing.length === 0)
        return true;
    res.status(400).type('application/json').send({ 'message': 'Request lacks required parameter(s).', 'missing': missing });
    return false;
}

router.post('/register', async (req, res, next) => {
    try {
        console.log(req.body.password, typeof req.body.password, req.body);
        if (!hasRequiredAttributes(req.body, ['username', 'email', 'password'], res)) return;
        const passwordData = await passwords.getHashedPassword(req.body.password);
        const quertResult = await db.query(`
        INSERT INTO Comics.Account (
            username,
            profileURL,
            email,
            biography,
            password,
            salt
        ) VALUES ($1, $2, $3, $4, $5, $6);`, [
                req.body.username,
                req.body.profileURL,
                req.body.email,
                '',
                passwordData.hash,
                passwordData.salt
            ]);
        const idQuery = await db.query('SELECT accountID FROM Comics.Account WHERE username = $1', [req.body.username]);
        res.status(201)
            .json({ token: passwords.createUserToken(idQuery.rows[0].accountID) });
    } catch (e) {
    console.error(e);
    res.status(500).send('Could not register user');
}
});

router.post('/login', async (req, res, next) => {
    try {
        const queryDB = await db.query('SELECT password, salt, accountID FROM Comics.Account WHERE username = $1;', [req.body.username]);
        if (queryDB.rowCount == 0) {
            res.status(400).send('User does not Exist');
            return;
        }
        const targetUser = queryDB.rows[0];
        if (await passwords.checkPassword(req.body.password, targetUser.password, targetUser.salt)) {
            res.status(200)
                .json(
                {
                    token: passwords.createUserToken(targetUser.accountid)
                });
            return;
        }
        res.status(403).send('Password Incorrect');
    }
    catch (e) {
        console.error(e);
        res.status(500).send('Could not login user')
    }
});

router.post('/verifyEmail', passwords.authorize, async (req, res) => {
    try {
        if (req.user.email) {
            await db.query(`
                UPDATE table_name
                SET emailVerified = true
                WHERE accountID = $1;
            `, [req.user.accountID]);
            res.sendStatus(200);
        } else {
            res.sendStatus(403);
        }
    } catch (err) {
        res.sendStatus(500);
    }
});


router.get('/emailAvalible', async (req, res) => {
    try {
        if (!hasRequiredAttributes(req.body, ['email'], res)) return;
        const ok = await isEmailAvalible(req.body.email);
        res.status(200)
            .type('application/json')
            .send({ ok: ok });
    } catch (err) {
        res.status(500)
            .send('Internal Failure');
    }
});


router.get('/usernameAvalible', async (req, res) => {
    try {
        if (!hasRequiredAttributes(req.body, ['username'], res)) return;
        const ok = await isUsernameAvalible(req.body.username);
        res.status(200)
            .type('application/json')
            .send({ ok: ok });
    } catch (err) {
        res.status(500)
            .send('Internal Failure');
    }
});

router.get('/testAuth', passwords.authorize, async (req, res) => {
    res.json(req.user);
});

module.exports = router;
