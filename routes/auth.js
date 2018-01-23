const db = require('../db.js');
const passwords = require('../passwords.js');
const express = require('express');
const router = express.Router();

/* Register new user */
router.post('/', async(req, res, next) => {

    res.send('done');
});
router.post('/register', async (req, res, next) => {
    try {
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
        res.send('done');
    } catch (e) {
        res.send('error');
    }
});

module.exports = router;