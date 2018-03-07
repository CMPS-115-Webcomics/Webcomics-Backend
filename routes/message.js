'use strict';
const express = require('express');
const router = express.Router();
const { db } = require('../models/db');
const validators = require('./validators');
const tokens = require('../tokens');

router.post('/send', tokens.authorize, validators.isMod, validators.requiredAttributes(['receiverID', 'subject', 'content']), async (req, res, next) => {
    try {
        await db.query(`
            INSERT INTO Comics.Message 
            (senderID, receiverID, subject, content)
            VALUES ($1, $2, $3, $4);
        `, [req.user.accountID, req.body.receiverID, req.body.subject, req.body.content]);
        res.sendStatus(200);
    } catch (err) {
        next(err);
        return;
    }
});

router.post('/markRead', tokens.authorize, validators.requiredAttributes(['messageID']), async (req, res, next) => {
    try {
        await db.query(`
            UPDATE Comics.Message
            SET read = true 
            WHERE messageID = $1;
        `, [req.body.messageID]);
        res.sendStatus(200);
    } catch (err) {
        next(err);
        return;
    }
});

router.get('/list', tokens.authorize, async (req, res, next) => {
    try {
        const result = await db.query(`
            SELECT acc.username as sender, msg.subject, msg.content, msg.read, msg.timeSent, msg.messageID
            FROM Comics.Message msg
            INNER JOIN Comics.Account AS acc ON msg.senderID = acc.accountID
            WHERE receiverID = $1
            ORDER BY timeSent DESC;`, [req.user.accountID]);
        res.json(result.rows);
    } catch (err) {
        next(err);
        return;
    }
});

module.exports = router;
