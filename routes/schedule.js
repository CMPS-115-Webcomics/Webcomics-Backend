'use strict';

const express = require('express');
const router = express.Router();
const { db } = require('../models/db');
const validators = require('./validators');
const tokens = require('../tokens');

// allows a user to view their personal release schedule
router.get('/mySchedule', tokens.authorize, async (req, res, next) => {
    try{
        const schedQuery = await db.query(`
            SELECT s.comicID, s.updateDay, s.updateType, s.updateWeek
            FROM Comics.Schedule s, Comics.Comic c
            WHERE c.AccountID = $1 AND c.comicID = s.comicID`, [req.user.accountID]);
        res.json(schedQuery.rows);
    }catch(err){
        next(err);
        return;
    }
});

// allows a user to edit their own release schedule
router.put('/editSchedule', 
    tokens.authorize, 
    validators.requiredAttributes(['comicID', 'updateDay']),
    validators.canModifyComic,
    async (req, res, next) => {
        try{
            await db.query(`
                INSERT INTO Comics.Schedule (comicID, updateDay, updateType, updateWeek)
                VALUES($1, $2, $3, $4)
                ON CONFLICT DO UPDATE SET updateType = $3, updateWeek = $4`, [
                req.body.comicID,
                req.body.updateDay,
                req.body.updateType,
                req.body.updateWeek || null
            ]);
        }catch(err){
            next(err);
            return;    
        }
    }
);