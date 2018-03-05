'use strict';
const sched = require('node-schedule');
const { db } = require('../db');

const rule = new schedule.RecurrenceRule();
rule.hour = 0;
rule.minute = 0;

const releaseChecker = schedule.scheduleJob(rule, async() => {

   const nextUnpublishedPage = await db.query(`
        SELECT MIN(pageNumber), comicID, chapterID
        FROM Comics.Page
        WHERE published = 'f'
        GROUP BY comicID, chapterID`);

    const nullVal = -1;
    for (const row of nextUnpublishedPage.rows){
        const pageNum = row.pageNumber;
        const comicID = row.comicID;
        const chapID = row.chapID || nullVal;

        if(chapID === nullVal){
            await db.query(`
                UPDATE Comics.Page p
                SET published = 't'
                FROM Comics.schedule sched
                WHERE p.pageNumber = $1 AND p.comicID = $2 AND p.chapterID IS NULL
                    AND sched.updateDay = TO_CHAR(CURRENT_TIMESTAMP, 'D')
                    AND (sched.updateType = 'weekly' 
                        OR updateWeek = TO_CHAR(CURRENT_TIMESTAMP, 'W')`, [pageNum, comicID]);
        }else{
            await db.query(`
            UPDATE Comics.Page p
            SET published = 't'
            FROM Comics.schedule sched
            WHERE p.pageNumber = $1 AND p.comicID = $2 AND p.chapterID = $3
                    AND sched.updateDay = TO_CHAR(CURRENT_TIMESTAMP, 'D')
                    AND (sched.updateType='weekly' 
                        OR updateWeek=TO_CHAR(CURRENT_TIMESTAMP, 'W')`, [pageNum, comicID, chapID]); 

            volumeIDQuery = await db.query(`
            UPDATE Comics.Chapter
            SET published = 't'
            WHERE published = 'f' AND chapterID = $1
            RETURNING volumeID`, [chapID]);

            await db.query(`
            UPDATE Comics.Volume
            SET published = 't'
            WHERE published = 'f' AND volumeID = $1`, [volumeIDQuery.rows[0].volumeID]);
        }
    }
});