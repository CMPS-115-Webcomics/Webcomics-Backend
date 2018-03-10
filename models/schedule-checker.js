'use strict';

const schedule = require('node-schedule');
const {
    db
} = require('./db');

const releasePages = async () => {
    //gets the lowest numbered unpublished page from each comic
    const nextUnpublishedPage = await db.query(`
        SELECT MIN(pageNumber), comicID, chapterID
        FROM Comics.Page
        WHERE published = 'f'
        GROUP BY comicID, chapterID`);

    const nullVal = -1;
    for (const row of nextUnpublishedPage.rows) {
        const pageNum = row.min;
        const comicID = row.comicid;
        const chapID = row.chapterid || nullVal;
        //checks if a comic with an unpublished page is scheduled to release a page today
        const releaseDateQuery = await db.query(`
            SELECT updateDay
            FROM Comics.Schedule
            WHERE comicID = $1 
              AND updateDay = TO_NUMBER(TO_CHAR(CURRENT_TIMESTAMP, 'D'), '99')
              AND (updateType = 'weekly' OR updateWeek = TO_NUMBER(TO_CHAR(CURRENT_TIMESTAMP, 'W'), '99'))
        `, [comicID]);

        //if the comic is scheduled release a page
        if (releaseDateQuery.rowCount !== 0) {
            //if the unpublished page isn't in a chapter
            if (chapID === nullVal) {
                //publish page without chapter
                await db.query(`
                    UPDATE Comics.Page
                    SET published = 't'
                    WHERE pageNumber = $1 AND comicID = $2 AND chapterID IS NULL`, [pageNum, comicID]);
            //if the unpublished page is in a chapter
            } else {
                //publish page with chapter
                await db.query(`
                    UPDATE Comics.Page
                    SET published = 't'
                    WHERE pageNumber = $1 AND comicID = $2 AND chapterID = $3`, [pageNum, comicID, chapID]);

                //if the page's chapter is unpublished, then publish it and get the volumeID
                const volumeIDQuery = await db.query(`
                    UPDATE Comics.Chapter
                    SET published = 't'
                    WHERE published = 'f' AND chapterID = $1
                    RETURNING volumeID`, [chapID]);

                //if we received a volumeID from the previous query
                if (volumeIDQuery.rowCount !== 0) {
                //if the volume is unpublished, publish it
                    await db.query(`
                        UPDATE Comics.Volume
                        SET published = 't'
                        WHERE published = 'f' AND volumeID = $1`, [volumeIDQuery.rows[0].volumeID]);
                }
            }
            //if the page's comic is unpublished, publish it
            await db.query(`
                UPDATE Comics.Comic
                SET published = 't'
                WHERE published = 'f' AND comicID = $1`, [comicID]);
        }
    }
};

const rule = new schedule.RecurrenceRule();
rule.hour = 0;
rule.minute = 1;

// automatically checks the release schedule every day
// if today is a release day, then the associated comic's next unpublished page is published
// if the released page is the first one in a chapter, volume, and/or comic, then they will be published too
schedule.scheduleJob(rule, async () => {
    try {
        console.log('Checking Release Schedule');
        await releasePages();
        console.log('Checking Completed');
    } catch (err) {
        console.error(err);
    }
});
