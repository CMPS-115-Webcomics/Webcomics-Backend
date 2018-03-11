'use strict';

const {db} = require('./db');
const upload = require('../upload');

/**
 * Gets a list of all comics
 *
 * @returns {*} Returns info about every comic
 */
const getAllComics = async () => {
    try {
        const result = await db.query(`
            SELECT comicID, accountID, title, comicURL, tagline, description, thumbnailURL 
            FROM Comics.Comic ORDER BY title`);
    return result.rows;
    } catch (err) {
        throw err;
    }
};

/**
 * Gets a list of all owned comics
 *
 * @param {number} accountID - id of the comic owner's account
 *
 * @returns {*} Returns info about every comic owned by an author
 */
const getAllOwnedComics = async accountID => {
    try {
        const result = await db.query(`
            SELECT comicID, accountID, title, comicURL, tagline, description, thumbnailURL 
            FROM Comics.Comic
            WHERE accountID = $1
            ORDER BY title`, [accountID]
        );
        return result.rows;
    } catch (err) {
        throw err;
    }
};

/**
 * Gets a single comic
 *
 * @param {*} comic - vessel to store comic info in
 *
 * @returns {*} Returns info about the comic
 */
const getComicInfo = async comic => {
    try {
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
    } catch (err) {
        throw err;
    }
};

/**
 * Gets a single published comic
 *
 * @param {string} comicURL - id of the comic owner's account
 *
 * @returns {*} Returns info about the comic owned by an author if it is published
 */
const getPublishedComic = async comicURL => {
    try {
        const comicQuery = await db.query(`
            SELECT * FROM Comics.Comic 
            WHERE comicURL = $1 AND published = 't'`, [comicURL]
        );

        if (comicQuery.rowCount === 0) {
            return -1;
        }
        return await getComicInfo(comicQuery.rows[0]);
    } catch (err) {
        throw err;
    }
};

/**
 * Gets a single owned comic
 *
 * @param {string} comicURL - id of the comic owner's account
 *
 * @returns {*} Returns info about the comic owned by an author
 */
const getOwnedComic = async comicURL => {
    try {
        const comicQuery = await db.query(`
            SELECT * FROM Comics.Comic 
            WHERE comicURL = $1`, [comicURL]
        );

        if (comicQuery.rowCount === 0) {
            return -1;
        }
        return await getComicInfo(comicQuery.rows[0]);
    } catch (err) {
        throw err;
    }
};

/**
 * Adds a new page for a given comic to the database
 *
 * @param {number} pageNumber - The page numbering
 * @param {number} comicID - The ID of the comic that owns this page
 * @param {string | null} altText - The alternate text of this page
 * @param {number | null} chapterID - The ID of the chapter that owns this page
 * @param {string} fileKey -The file key to the page's image
 *
 * @returns {void}
 */
const addPage = async (pageNumber, comicID, altText, chapterID, fileKey) => {
    try {
        await db.query(`
            INSERT INTO Comics.Page 
            (pageNumber, comicID, altText, chapterID, imgUrl)
            VALUES ($1, $2, $3, $4, $5)`, [pageNumber, comicID, altText, chapterID, fileKey]
        );
    } catch (err) {
        throw err;
    }
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
    try {
        const created = await db.query(`
            INSERT INTO Comics.Chapter 
            (comicID, name, volumeID, chapterNumber)
            VALUES ($1, $2, $3, $4)
            RETURNING chapterID;
        `, [comicID, name, volumeID, chapterNumber]);
        return created.rows[0];
    } catch (err) {
        throw err;
    }
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
    try {
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
    } catch (err) {
        throw err;
    }
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

//deletes images from the cloud by using their URLs
const deleteImages = async rows => {
    for (const row of rows) {
        const url = row.imgurl || row.thumbnailurl;
        upload.deleteFromGCS(url, row.imgurl !== undefined);
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
 * @param {number} volumeID - The volume that the chapter was in
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
 * Shifts all of a comic's volume numbers greater than the one given down one
 *
 * @param {number} volumeNumber - The volume number that was removed
 * @param {number} comicID - The comic that the volume was in
 *
 * @returns {void}
 */
const shiftVolumeNumDown = async (volumeNumber, comicID) => {
    await db.query(`
        UPDATE Comics.Volume
        SET volumeNumber = volumeNumber - 1
        WHERE comicID = $1 AND volumeNumber > $2`, [comicID, volumeNumber]);
};

/**
 * Deletes a page and its associated image
 *
 * @param {number} pageID - The ID of the page being deleted
 *
 * @returns {void}
 */
const deletePage = async pageID => {
    try {
        const urlQuery = await db.query(`
            SELECT imgURL, pageNumber, chapterID
            FROM Comics.Page
            WHERE pageID = $1`, [pageID]
        );

        deleteImages(urlQuery.rows);

        await db.query(`
            DELETE FROM Comics.Page
            WHERE comicID = $1`, [pageID]
        );

        const pageNum = urlQuery.rows[0].pagenumber;
        const chapterID = urlQuery.rows[0].chapterid || null;
        shiftPageNumDown(pageNum, chapterID);
    } catch (err) {
        throw err;
    }
};

/**
 * Deletes a chapter and its contents, images included
 *
 * @param {number} chapterID - The ID of the chapter being deleted
 *
 * @returns {void}
 */
const deleteChapter = async chapterID => {
    try {
        const urlQuery = await db.query(`
            SELECT imgURL
            FROM Comics.Page
            WHERE chapterID = $1`, [chapterID]
        );

        deleteImages(urlQuery.rows);

        const chapterQuery = await db.query(`
            SELECT chapterNumber, volumeID
            FROM Comics.Chapter
            WHERE chapterID = $1`, [chapterID]
        );

        await db.query(`
            DELETE FROM Comics.Chapter
            WHERE chapterID = $1`, [chapterID]
        );

        const chapterNum = chapterQuery.rows[0].chapternumber;
        const volumeID = chapterQuery.rows[0].volumeid;
        shiftChapterNumDown(chapterNum, volumeID);
    } catch (err) {
        throw err;
    }
};

/**
 * Deletes a volume and its contents, images included
 *
 * @param {number} volumeID - The ID of the volume being deleted
 *
 * @returns {void}
 */
const deleteVolume = async volumeID => {
    try {
        const urlQuery = await db.query(`
            SELECT imgURL
            FROM Comics.Page 
            WHERE chapterID IN (
                SELECT chapterID
                FROM Comics.Chapter 
                WHERE volumeID = $1
            )
        `, [volumeID]);

        deleteImages(urlQuery.rows);

        const volumeQuery = await db.query(`
            SELECT volumeNumber, comicID
            FROM Comics.Volume
            WHERE volumeID = $1`, [volumeID]
        );

        await db.query(`
            DELETE FROM Comics.Volume
            WHERE volumeID = $1`, [volumeID]
        );

        const volumeNum = volumeQuery.rows[0].volumenumber;
        const comicID = volumeQuery.rows[0].comicid;
        shiftVolumeNumDown(volumeNum, comicID);
    } catch (err) {
        throw err;
    }
};

/**
 * Deletes a comic and its contents, images included
 *
 * @param {number} comicID - The ID of the comic being deleted
 *
 * @returns {void}
 */
const deleteComic = async comicID => {
    try {
        const urlQuery = await db.query(`
            SELECT imgURL
            FROM Comics.Page
            WHERE comicID = $1`, [comicID]
        );

        deleteImages(urlQuery.rows);

        const thumbnailQuery = await db.query(`
            SELECT thumbnailURL
            FROM Comics.Comic
            WHERE comicID = $1`, [comicID]
        );

        deleteImages(thumbnailQuery.rows);

        await db.query(`
            DELETE FROM Comics.Comic
            WHERE comicID = $1`, [comicID]
        );
    } catch (err) {
        throw err;
    }
};

/**
 * Updates the metadata of a comic
 *
 * @param {number} comicID - The ID of the comic being updated
 * @param {string} title - The comic's title
 * @param {string} description - The comic's description
 * @param {string} tagline - The comic's tagline
 * @param {boolean} published - States if the comic is published or not
 *
 * @returns {void}
 */
const updateComic = async (comicID, title, description, tagline, published) => {
    try {
        await db.query(`
            UPDATE Comics.Comic
            SET title = $1, description = $2, published = $3, tagline = $4
            WHERE comicID = $5
        `, [title, description, published, tagline, comicID]);
    } catch (err) {
        throw err;
    }
};

/**
 * Updates the thumbnail of a comic
 *
 * @param {number} comicID - The ID of the comic being updated
 * @param {string} fileKey - The file key for thumbnail image
 *
 * @returns {void}
 */
const updateThumbnail = async (comicID, fileKey) => {
    try {
        const urlQuery = await db.query(`
            SELECT thumbnailURL 
            FROM Comics.Comics
            WHERE comicID = $1
        `, [comicID]);

        deleteImages(urlQuery.rows);

        await db.query(`
            UPDATE Comics.Comic
            SET thumbnailURL = $1
            WHERE comicID    = $2`
        , [fileKey, comicID]);
    } catch (err) {
        throw err;
    }
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
    deletePage,
    deleteChapter,
    deleteVolume,
    deleteComic,
    updateComic,
    updateThumbnail,
    movePage,
    moveChapter
};
