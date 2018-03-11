'use strict';

const {
    db
} = require('./db');

/**
 * Adds a new volume for a given comic to the database
 *
 * @param {number} comicID - The ID of the comic that owns this volume
 * @param {string | null} name - The name of this volume
 * @param {number | null} volumeNumber  -The number of this volume
 *
 * @returns {{volumeid: number}} The id of the created volume
 */
const addVolume = async (comicID, name, volumeNumber) => {
    const created = await db.query(`
            INSERT INTO Comics.Volume 
            (comicID, name, volumeNumber)
            VALUES ($1, $2, $3)
            RETURNING volumeID`, [
        comicID, name, volumeNumber
    ]);
    return created.rows[0];
};

/**
 * Adds a new chapter for a given comic to the database
 *
 * @param {number} comicID - The ID of the comic that owns this chapter
 * @param {string | null} name - The name of this chapter
 * @param {number | null} volumeID - The volume that owns this chapter
 * @param {number | null} chapterNumber  -The number of this chapter
 *
 * @returns {{volumeid: number}} The id of the created volume
 */
const addChapter = async (comicID, name, volumeID, chapterNumber) => {
    const chapterInsertion = await db.query(`
                INSERT INTO Comics.Chapter 
                (comicID, name, volumeID, chapterNumber)
                VALUES ($1, $2, $3, $4)
                RETURNING chapterID;`, [
        comicID, name, volumeID, chapterNumber
    ]);
    return chapterInsertion.rows[0];
};

/**
 * Creates a new comic based on the given data
 *
 * @param {*} comicData The comics information
 * @returns {*} The resulting comic
 */
const createComic = async comicData => {
    try {
        const created = await db.query(`
        INSERT INTO Comics.Comic 
        (accountID, title, comicURL, thumbnailURL, tagline, description, organization)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING comicID;
    `, [
            comicData.accountID,
            comicData.title,
            comicData.comicURL,
            comicData.fileKey,
            comicData.tagline,
            comicData.description,
            comicData.organization
        ]);

        const newComicData = created.rows[0];

        if (comicData.organization === 'volumes') {
            const volumeID = (await addVolume(newComicData.comicid, null, 1)).volumeid;
            await addChapter(newComicData.comicid, null, volumeID, 1);
        } else if (comicData.organization === 'pages') {
            await addChapter(newComicData.comicID, null, null, 1);
        }
        return newComicData;
    } catch (err) {
        throw err;
    }
};

/**
 * Shifts all of a chapter's page numbers greater than the one given down one
 *
 * @param {number} pageNumber - The page number that was removed
 * @param {number | null} chapterID - The chapter that the page was in
 *
 * @returns {void}
 */
const shiftPageNumDown = async (pageNumber, chapterID) => {
    if (!chapterID) {
        await db.query(`
            UPDATE Comics.Page
            SET pageNumber = pageNumber - 1
            WHERE chapterID IS NULL AND pageNumber > $1`, [pageNumber]);
    } else {
        await db.query(`
            UPDATE Comics.Page
            SET pageNumber = pageNumber - 1
            WHERE chapterID = $1 AND pageNumber > $2`, [chapterID, pageNumber]);
    }
};

/**
 * Shifts all of a volume's chapter numbers greater than the one given down one
 *
 * @param {number} chapterNumber - The chapter number that was removed
 * @param {number} volumeID - The volume that the page was in
 *
 * @returns {void}
 */
const shiftChapterNumDown = async (chapterNumber, volumeID) => {
    await db.query(`
        UPDATE Comics.Chapter
        SET chapterNumber = chapterNumber - 1
        WHERE volumeID = $1 AND chapterNumber > $2`, [volumeID, chapterNumber]);
};

/**
 * Moves a page to another chapter in the same comic
 *
 * @param {number} pageID - The ID of the page being moved
 * @param {number | null} chapterID - The chapter that the page will be moved to
 *
 * @returns {void}
 */
const movePage = async (pageID, chapterID) => {

    const sameComicQuery = await db.query(`
        SELECT comicID
        FROM Comics.Chapter
        WHERE chapterID = $1 AND comicID = (SELECT comicID FROM Comics.Page WHERE pageID = $2)
    `, [chapterID, pageID]);

    if (sameComicQuery.rowCount === 0) {
        console.error('Page must move to a chapter that is in the same comic');
        return;
    }

    const pageNumQuery = await db.query(`
        SELECT MAX(pageNumber) + 1 AS pageNum
        FROM Comics.Page
        WHERE chapterID = $1
    `, [chapterID]);

    const pageNum = pageNumQuery.rows[0].pagenum || 1;

    const oldDataQuery = await db.query(`
        SELECT chapterID, pageNumber
        FROM Comics.Page
        WHERE pageID = $1
    `, [pageID]);

    await db.query(`
        UPDATE Comics.Page 
        SET chapterID = $1, pageNumber = $2, published = 'f'
        WHERE pageID = $3;
    `, [
        chapterID, pageNum, pageID
    ]);

    const oldPageNum = oldDataQuery.rows[0].pagenumber;
    const oldChapter = oldDataQuery.rows[0].chapterid || null;
    await shiftPageNumDown(oldPageNum, oldChapter);
};

/**
 * Moves a chapter to another volume in the same comic
 *
 * @param {number} chapterID - The ID of the chapter being moved
 * @param {number} volumeID - The volume that the chapter will be moved to
 *
 * @returns {void}
 */
const moveChapter = async (chapterID, volumeID) => {

    const sameComicQuery = await db.query(`
        SELECT comicID
        FROM Comics.Volume
        WHERE volumeID = $1 AND comicID = (SELECT comicID FROM Comics.Chapter WHERE chapterID = $2)
    `, [volumeID, chapterID]);

    if (sameComicQuery.rowCount === 0) {
        console.error('Chapter must move to a volume that is in the same comic');
        return;
    }

    const chapterNumQuery = await db.query(`
        SELECT MAX(chapterNumber) + 1 AS chapterNum
        FROM Comics.Chapter
        WHERE volumeID = $1
    `, [volumeID]);

    const chapterNum = chapterNumQuery.rows[0].chapternum || 1;

    const oldDataQuery = await db.query(`
        SELECT volumeID, chapterNumber
        FROM Comics.Chapter
        WHERE chapterID = $1
    `, [chapterID]);

    await db.query(`
        UPDATE Comics.Page
        SET published = 'f'
        WHERE chapterID = $1`, [chapterID]);

    await db.query(`
        UPDATE Comics.Chapter 
        SET volumeID = $1, chapterNumber = $2, published = 'f'
        WHERE chapterID = $3;
    `, [
        volumeID, chapterNum, chapterID
    ]);

    const oldChapterNum = oldDataQuery.rows[0].pagenumber;
    const oldVolume = oldDataQuery.rows[0].volumeid;
    await shiftChapterNumDown(oldChapterNum, oldVolume);
};

module.exports = {
    createComic,
    addVolume,
    addChapter,
    movePage,
    moveChapter
};
