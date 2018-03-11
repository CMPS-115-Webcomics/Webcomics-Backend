'use strict';

const {
    db
} = require('./db');

/**
 * Gets a list of all comics
 *
 * @returns {*} Returns info about every comic
 */
const getAllComics = async () => {
    const result = await db.query(`
        SELECT comicID, accountID, title, comicURL, tagline, description, thumbnailURL 
        FROM Comics.Comic ORDER BY title`);
    return result.rows;
};

/**
 * Gets a list of all owned comics
 *
 * @param {number} accountID - id of the comic owner's account
 *
 * @returns {*} Returns info about every comic owned by an author
 */
const getAllOwnedComics = async accountID => {
    const result = await db.query(`
        SELECT comicID, accountID, title, comicURL, tagline, description, thumbnailURL 
        FROM Comics.Comic
        WHERE accountID = $1
        ORDER BY title`, [accountID]);
    return result.rows;
};

/**
 * Gets a single comic
 *
 * @param {*} comic - vessel to store comic info in
 *
 * @returns {*} Returns info about the comic
 */
const getComicInfo = async comic => {
        const comicID = comic.comicid;

        comic.chapters = (await db.query(`
            SELECT *
            FROM Comics.Chapter
            WHERE comicID = $1
            ORDER BY chapterNumber`, [comicID])).rows;

        comic.volumes = (await db.query(`
            SELECT *
            FROM Comics.Volume
            WHERE comicID = $1
            ORDER BY volumeNumber`, [comicID])).rows;

        comic.pages = (await db.query(`
            SELECT *
            FROM Comics.Page
            WHERE comicID = $1
            ORDER BY pageNumber`, [comicID]))
            .rows;

        comic.owner = (await db.query(`
            SELECT a.username, a.profileURL
            FROM Comics.Account a
            WHERE a.accountID = $1`, [comic.accountid]))
            .rows[0];

            return comic;
};

/**
 * Gets a single published comic
 *
 * @param {string} comicURL - id of the comic owner's account
 *
 * @returns {*} Returns info about the comic owned by an author if it is published
 */
const getPublishedComic = async comicURL => {
    const comicQuery = await db.query(`
        SELECT * FROM Comics.Comic 
        WHERE comicURL = $1 AND published = 't'`, [comicURL]);

        if (comicQuery.rowCount === 0) {
            return -1;
        }
        return await getComicInfo(comicQuery.rows[0]);
};

/**
 * Gets a single owned comic
 *
 * @param {string} comicURL - id of the comic owner's account
 *
 * @returns {*} Returns info about the comic owned by an author
 */
const getOwnedComic = async comicURL => {
    const comicQuery = await db.query(`
        SELECT * FROM Comics.Comic 
        WHERE comicURL = $1`, [comicURL]);

        if (comicQuery.rowCount === 0) {
            return -1;
        }
        return await getComicInfo(comicQuery.rows[0]);
};

/**
 * Adds a new page for a given comic to the database
 *
 * @param {number} pageNumber - The page numbering
 * @param {number} comicID - The ID of the comic that owns this page
 * @param {string | null} altText - The alternate text of this page
 * @param {number | null} chapterID - The ID of the chapter that owns this page
 * @param {number} fileKey -The file key to the page's image
 *
 * @returns {void}
 */
const addPage = async (pageNumber, comicID, altText, chapterID, fileKey) => {
    await db.query(`
        INSERT INTO Comics.Page 
        (pageNumber, comicID, altText, chapterID, imgUrl)
        VALUES ($1, $2, $3, $4, $5)`, [pageNumber, comicID, altText, chapterID, fileKey]);
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
    const created = await db.query(`
        INSERT INTO Comics.Chapter 
        (comicID, name, volumeID, chapterNumber)
        VALUES ($1, $2, $3, $4)
        RETURNING chapterID;
    `, [comicID, name, volumeID, chapterNumber]);
    return created.rows[0];
};

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
        RETURNING volumeID
    `, [comicID, name, volumeNumber]);
    const volumeID = created.rows[0].volumeid;
    const chapterData = await addChapter(comicID, null, volumeID, 1);
    return {
        volumeID,
        chapterID: chapterData.chapterid
    };
};

/**
 * Creates a new comic based on the given data
 *
 * @param {*} comicData The comic's information
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
            await addVolume(newComicData.comicid, null, 1);
        } else if (comicData.organization === 'chapters') {
            await addChapter(newComicData.comicid, null, null, 1);
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
    try {
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
    } catch (err) {
        throw err;
    }
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
    try {
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
    } catch (err) {
        throw err;
    }
};

module.exports = {
    getAllComics,
    getAllOwnedComics,
    getPublishedComic,
    getOwnedComic,
    createComic,
    addPage,
    addChapter,
    addVolume,
    movePage,
    moveChapter
};
