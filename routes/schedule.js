'use strict';

const express = require('express');
const router = express.Router();
const {
    db
} = require('../models/db');
const validators = require('./validators');
const tokens = require('../tokens');

// allows a user to view their personal release schedule
router.get('/getSchedule/:comicID', async (req, res, next) => {
    try {
        const schedQuery = await db.query(`
            SELECT s.comicID, s.updateDay, s.updateType, s.updateWeek
            FROM Comics.Schedule s
            WHERE s.comicID = $1`, [req.params.comicID]);
        res.json(schedQuery.rows);
    } catch (err) {
        next(err);
        return;
    }
});

// allows a user to set a weekly schedule
router.put('/setWeeklySchedule',
    tokens.authorize,
    validators.requiredAttributes(['comicID', 'updateDays']),
    validators.canModifyComic,
    async (req, res, next) => {
        try {
            await db.query(`
                DELETE FROM Comics.Schedule
                WHERE comicID = $1`, [req.body.comicID]);
            const insertions = Array.from(req.body.updateDays, day => {
                return db.query(`
                    INSERT INTO Comics.Schedule (comicID, updateDay, updateType)
                    VALUES($1, $2, 'weekly')`, [req.body.comicID, day]);
            });
            await Promise.all(insertions);
            res.status(200).json({
                message: 'ok'
            });
        } catch (err) {
            next(err);
            return;
        }
    }
);

// allows a user to edit their own release schedule
router.put('/editSchedule',
    tokens.authorize,
    validators.requiredAttributes(['comicID', 'updateDay']),
    validators.canModifyComic,
    async (req, res, next) => {
        try {
            await db.query(`
                INSERT INTO Comics.Schedule (comicID, updateDay, updateType, updateWeek)
                VALUES($1, $2, $3, $4)
                ON CONFLICT DO UPDATE SET updateType = $3, updateWeek = $4`, [
                req.body.comicID,
                req.body.updateDay,
                req.body.updateType,
                req.body.updateWeek || null
            ]);
        } catch (err) {
            next(err);
            return;
        }
    }
);

module.exports = router;
