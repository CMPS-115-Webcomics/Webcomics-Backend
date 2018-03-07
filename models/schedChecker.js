'use strict';
const sched = require('node-schedule');
const { db } = require('./db');

const rule = new schedule.RecurrenceRule();
rule.hour = 0;
rule.minute = 0;

//automatically checks the release schedule every day
//if today is a release day, then the associated comic's next unpublished page is published
//if the released page is the first one in a chapter, volume, and/or comic, then they will be published too
const releaseChecker = schedule.scheduleJob(rule, async() => {

   const nextUnpublishedPage = await db.query(`
        SELECT MIN(pageNumber), comicID, chapterID
        FROM Comics.Page
        WHERE published = 'f'
        GROUP BY comicID, chapterID`);

    const nullVal = -1;
    for await (const row of nextUnpublishedPage.rows){
        const pageNum = row.pageNumber;
        const comicID = row.comicID;
        const chapID = row.chapID || nullVal;

        const releaseDateQuery = await db.query(`
            SELECT updateDay
            FROM Comics.schedule
            WHERE comicID = $1 AND updateDay = TO_CHAR(CURRENT_TIMESTAMP, 'D')
                AND (sched.updateType = 'weekly' OR sched.updateWeek = TO_CHAR(CURRENT_TIMESTAMP, 'W'))
        `, [comicID]);

        if(releaseDateQuery.rowCount !== 0){
            if(chapID === nullVal){
                await db.query(`
                    UPDATE Comics.Page
                    SET published = 't'
                    WHERE pageNumber = $1 AND comicID = $2 AND chapterID IS NULL`, [pageNum, comicID]);
            }else{
                await db.query(`
                UPDATE Comics.Page
                SET published = 't'
                WHERE p.pageNumber = $1 AND p.comicID = $2 AND p.chapterID = $3`, [pageNum, comicID, chapID]); 

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
            await db.query(`
            UPDATE Comics.Comic
            SET published = 't'
            WHERE published = 'f' AND comicID = $1`, [comicID]);
        }
    }
});