const express = require('express');
const app = express();
const router = express.Router();
const db = require('../db');
const validators = require('./validators');
const upload = require('../upload');
const passwords = require('../passwords');

router.post('/send', passwords.authorize, validators.isMod, validators.requiredAttributes(['receiverID', 'subject', 'content']), async function (req, res, next) {
    try {
        await db.query(`
            INSERT INTO Comics.Message 
            (senderID, receiverID, subject, content)
            VALUES ($1, $2, $3, $4);
        `, [req.user.accountID, req.body.receiverID, req.body.subject, req.body.content]);
        res.sendStatus(200);
    } catch (err) {
        next(err);
    }
});

router.post('/markRead', passwords.authorize, validators.requiredAttributes(['messageID']), async function (req, res, next) {
    try {
        await db.query(`
            UPDATE Comics.Message
            SET read = true 
            WHERE messageID = $1;
        `, [req.body.messageID]);
        res.sendStatus(200);
    } catch (err) {
        next(err);
    }
});

router.get('/list', passwords.authorize, async function (req, res, next) {
    try {
        let result = await db.query(`
            SELECT acc.username as sender, msg.subject, msg.content, msg.read, msg.timeSent, msg.messageID
            FROM Comics.Message msg
            INNER JOIN Comics.Account AS acc ON msg.senderID = acc.accountID
            WHERE receiverID = $1
            ORDER BY timeSent DESC;`, [req.user.accountID]);
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
