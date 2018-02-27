'use strict';

const express = require('express');
const router = express.Router();
const {
    db
} = require('../db');

/**
 * Checks if a certain table has a row with the given attribute.
 * This is useful so the client can immediatly provide feedback on
 * whether a certain unique key is avalible.
 *
 * @param {string} table The table whose attribute we are checking
 * @param {string} attribute The key of the table
 * @param {boolean} caseInsensitive Whether the search should ignore capitiization
 * @returns {function(Request, Response, NextFunction): void} Route handler that checks the attribute
 */
const checkAvalibility = (table, attribute, caseInsensitive) => {
    return async (req, res, next) => {
        try {
            const sql = caseInsensitive ?
                `SELECT ${attribute} FROM Comics.${table} WHERE LOWER(${attribute})=LOWER($1)` :
                `SELECT ${attribute} FROM Comics.${table} WHERE ${attribute}=$1`;
            const query = await db.query(sql, [req.params[attribute]]);
            res.json({
                available: query.rowCount === 0
            });
        } catch (err) {
            next(err);
            return;
        }
    };
};

router.get('/emailorpassword/:nameOrPass', async (req, res, next) => {
    try {
        const nameOrPass = req.params.nameOrPass.toString();
        const query = await db.query(`
            SELECT accountID 
            FROM Comics.Account 
            WHERE LOWER(username) = LOWER($1)
               OR LOWER(email)    = LOWER($2)`, [nameOrPass, nameOrPass.toLowerCase()]);
        res.json({
            available: query.rowCount === 0
        });
    } catch (err) {
        next(err);
        return;
    }
});


router.get('/email/:email', checkAvalibility('Account', 'email', true));
router.get('/username/:username', checkAvalibility('Account', 'username', true));
router.get('/title/:title', checkAvalibility('Comic', 'title'));
router.get('/comicURL/:comicURL', checkAvalibility('Comic', 'comicURL'));

module.exports = router;
