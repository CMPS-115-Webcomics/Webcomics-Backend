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

module.exports = {
    createComic,
    addVolume,
    addChapter
};
