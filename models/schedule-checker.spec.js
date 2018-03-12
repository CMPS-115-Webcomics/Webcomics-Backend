'use strict';

const schedule = require('./schedule-checker');
const {
    db
} = require('./db');

//Presumes that the database schema and tables were created, but no data is currently in the database tables
//After this file is done, the database should be completely dropped and remade
describe('Schedule-Checker', () => {

    beforeAll(async () => {
        await db.query(`
            INSERT INTO Comics.Account (accountID, username, email, password, salt)
            VALUES(10, 'c', 'c', '12345678', 'c')`
        );

        await db.query(`
            INSERT INTO Comics.Comic (comicID, accountID, title, comicURL, thumbnailURL,
                published, tagline, description)
            VALUES(1, 10, 'a', 'a', 'a', 'f', 'a', 'a')`
        );
        await db.query(`
            INSERT INTO Comics.Volume (volumeID, comicID, volumeNumber, published)
            VALUES(1, 1, 1, 'f')`
        );
        await db.query(`
            INSERT INTO Comics.Chapter (chapterID, volumeID, chapterNumber, comicID, published)
            VALUES(1, 1, 1, 1, 'f')`
        );
        await db.query(`
            INSERT INTO Comics.Page (pageID, pageNumber, chapterID, comicID, published)
            VALUES(1, 1, 1, 1, 'f')`
        );
        await db.query(`
            INSERT INTO Comics.Page (pageID, pageNumber, chapterID, comicID, published)
            VALUES(2, 2, 1, 1, 'f')`
        );
        await db.query(`
            INSERT INTO Comics.Page (pageID, pageNumber, chapterID, comicID, published)
            VALUES(3, 3, 1, 1, 'f')`
        );

        await db.query(`
            INSERT INTO Comics.Comic (comicID, accountID, title, comicURL, thumbnailURL,
                published, tagline, description)
            VALUES(2, 10, 'b', 'b', 'b', 'f', 'b', 'b')`
        );
        await db.query(`
            INSERT INTO Comics.Page (pageID, pageNumber, comicID, published)
            VALUES(4, 1, 2, 'f')`
        );
        await db.query(`
            INSERT INTO Comics.Page (pageID, pageNumber, comicID, published)
            VALUES(5, 2, 2, 'f')`
        );
        await db.query(`
            INSERT INTO Comics.Page (pageID, pageNumber, comicID, published)
            VALUES(6, 3, 2, 'f')`
        );
    });
    it('should release the lowest numbered unpublished page', async () => {
        await db.query(`
            INSERT INTO Comics.Schedule
            VALUES(1, TO_NUMBER(TO_CHAR(CURRENT_TIMESTAMP, 'D'), '99'), 'weekly')
            ON CONFLICT DO NOTHING`
        );
        await db.query(`
            INSERT INTO Comics.Schedule
            VALUES(2, TO_NUMBER(TO_CHAR(CURRENT_TIMESTAMP, 'D'), '99'), 'weekly')
            ON CONFLICT DO NOTHING`
        );
        await db.query(`
            UPDATE Comics.Comic
            SET published = 'f'`
        );
        await db.query(`
            UPDATE Comics.Volume
            SET published = 'f'`
        );
        await db.query(`
            UPDATE Comics.Chapter
            SET published = 'f'`
        );
        await db.query(`
            UPDATE Comics.page
            SET published = 't'
            WHERE pageNumber = 1`
        );
        await db.query(`
            UPDATE Comics.page
            SET published = 'f'
            WHERE pageNumber <> 1`
        );

        await schedule.releasePages();

        const result6 = await db.query(`
        SELECT pageID FROM Comics.Page
        WHERE published = 't'`
        );
        expect(result6.rowCount).toEqual(4);
    });
});


    it('should do nothing to the database if there is nothing scheduled to release', async () => {
        await db.query('DELETE FROM Comics.Schedule');

        await db.query(`
            UPDATE Comics.Comic
            SET published = 'f'`
        );
        await db.query(`
            UPDATE Comics.Volume
            SET published = 'f'`
        );
        await db.query(`
            UPDATE Comics.Chapter
            SET published = 'f'`
        );
        await db.query(`
            UPDATE Comics.Page
            SET published = 'f'`
        );

        await schedule.releasePages();

        const result1 = await db.query(`
        SELECT pageID FROM Comics.Page
        WHERE published = 't'`
        );

        expect(result1.rowCount).toEqual(0);
    });

    it('should publish a page if it is scheduled to do so and set its chapter, volume, and comic as published'
    , async () => {
        await db.query(`
            INSERT INTO Comics.Schedule 
            VALUES(1, TO_NUMBER(TO_CHAR(CURRENT_TIMESTAMP, 'D'), '99'), 'weekly')
            ON CONFLICT DO NOTHING`
        );
        await db.query(`
            INSERT INTO Comics.Schedule 
            VALUES(2, TO_NUMBER(TO_CHAR(CURRENT_TIMESTAMP, 'D'), '99'), 'weekly')
            ON CONFLICT DO NOTHING`
        );
        await db.query(`
            UPDATE Comics.Comic
            SET published = 'f'`
        );
        await db.query(`
            UPDATE Comics.Volume
            SET published = 'f'`
        );
        await db.query(`
            UPDATE Comics.Chapter
            SET published = 'f'`
        );
        await db.query(`
            UPDATE Comics.Page
            SET published = 'f'`
        );

        await schedule.releasePages();

        const comicResult2 = await db.query(`
        SELECT comicID FROM Comics.Comic
        WHERE published = 't'`
        );
        const volumeResult2 = await db.query(`
        SELECT volumeID FROM Comics.Volume
        WHERE published = 't'`
        );
        const chapterResult2 = await db.query(`
        SELECT chapterID FROM Comics.Chapter
        WHERE published = 't'`
        );
        const pageResult2 = await db.query(`
        SELECT pageID FROM Comics.Page
        WHERE published = 't'`
        );

        expect(comicResult2.rowCount).toEqual(2);
        expect(volumeResult2.rowCount).toEqual(1);
        expect(chapterResult2.rowCount).toEqual(1);
        expect(pageResult2.rowCount).toEqual(2);
    });

    it('should be able to release a page even if whatever directly above it (comic/chapter) is already published'
    , async () => {
        await db.query(`
            INSERT INTO Comics.Schedule 
            VALUES(1, TO_NUMBER(TO_CHAR(CURRENT_TIMESTAMP, 'D'), '99'), 'weekly')
            ON CONFLICT DO NOTHING`
        );
        await db.query(`
            INSERT INTO Comics.Schedule 
            VALUES(2, TO_NUMBER(TO_CHAR(CURRENT_TIMESTAMP, 'D'), '99'), 'weekly')
            ON CONFLICT DO NOTHING`
        );

        await db.query(`
            UPDATE Comics.Comic
            SET published = 't'
            WHERE comicID = 1`
        );
        await db.query(`
            UPDATE Comics.Comic
            SET published = 'f'
            WHERE comicID = 2`
        );
        await db.query(`
            UPDATE Comics.Volume
            SET published = 't'`
        );
        await db.query(`
            UPDATE Comics.Chapter
            SET published = 'f'`
        );
        await db.query(`
            UPDATE Comics.Page
            SET published = 'f'`
        );

        await schedule.releasePages();

        const result3 = await db.query(`
        SELECT pageID FROM Comics.Page
        WHERE published = 't'`
        );

        expect(result3.rowCount).toEqual(2);
    });

    it('should be able to publish a chapter even if its volume is already published'
    , async () => {
        await db.query(`
            INSERT INTO Comics.Schedule 
            VALUES(1, TO_NUMBER(TO_CHAR(CURRENT_TIMESTAMP, 'D'), '99'), 'weekly')
            ON CONFLICT DO NOTHING`
        );
        await db.query(`
            INSERT INTO Comics.Schedule 
            VALUES(2, TO_NUMBER(TO_CHAR(CURRENT_TIMESTAMP, 'D'), '99'), 'weekly')
            ON CONFLICT DO NOTHING`
        );

        await db.query(`
            UPDATE Comics.Comic
            SET published = 't'`
        );
        await db.query(`
            UPDATE Comics.Volume
            SET published = 't'`
        );
        await db.query(`
            UPDATE Comics.Chapter
            SET published = 'f'`
        );
        await db.query(`
            UPDATE Comics.Page
            SET published = 'f'`
        );

        await schedule.releasePages();

        const result4 = await db.query(`
        SELECT chapterID FROM Comics.Chapter
        WHERE published = 't'`
        );

        expect(result4.rowCount).toEqual(1);
    });

    it('should be able to publish a volume even if its comic is already published'
    , async () => {
        await db.query(`
            INSERT INTO Comics.Schedule 
            VALUES(1, TO_NUMBER(TO_CHAR(CURRENT_TIMESTAMP, 'D'), '99'), 'weekly')
            ON CONFLICT DO NOTHING`
        );
        await db.query(`
            INSERT INTO Comics.Schedule 
            VALUES(2, TO_NUMBER(TO_CHAR(CURRENT_TIMESTAMP, 'D'), '99'), 'weekly')
            ON CONFLICT DO NOTHING`
        );
        await db.query(`
            UPDATE Comics.Comic
            SET published = 't'`
        );
        await db.query(`
            UPDATE Comics.Volume
            SET published = 'f'`
        );
        await db.query(`
            UPDATE Comics.Chapter
            SET published = 'f'`
        );
        await db.query(`
            UPDATE Comics.Page
            SET published = 'f'`
        );

        await schedule.releasePages();

        const volumeResult5 = await db.query(`
        SELECT volumeID FROM Comics.Volume
        WHERE published = 't'`
        );
        const chapterResult5 = await db.query(`
        SELECT chapterID FROM Comics.Chapter
        WHERE published = 't'`
        );

        expect(volumeResult5.rowCount).toEqual(1);
        await expect(chapterResult5.rowCount).toEqual(1);
    });
