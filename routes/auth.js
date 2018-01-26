const db = require('../db.js');
const passwords = require('../passwords.js');
const express = require('express');
const router = express.Router();

/* Register new user */
router.post('/register', async(req, res, next) => {
    const passwordData = await passwords.getHashedPassword(req.body.password);
    const quertResult = await db.query(`INSERT INTO Comics.Account (
        username,
        profileURL,
        email,
        biography,
        password,
        salt
    ) VALUES (*, *, *, *, *, *);`, [
        req.body.username,
        req.body.profileURL,
        req.body.email,
        '',
        passwordData.hash,
        passwordData.salt
    ])
    res.send('done');
});

module.exports = router;