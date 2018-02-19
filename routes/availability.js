const express = require('express');
const router = express.Router();
const db = require('../db');

function checkAvalibility(table, attribute) {
    return async (req, res, next ) => {
        try {
            const query = await db.query(`SELECT ${attribute} FROM Comics.${table} WHERE ${attribute}=$1`, [req.params[attribute]]);
            res.json({
                available: query.rowCount === 0
            });
        } catch (err) {
            next(err);
        }
    };
}

router.get('/emailorpassword/:nameOrPass', async (req, res, next) => {
    try {
        let nameOrPass = req.params.nameOrPass.toString();
        const query = await db.query(`
            SELECT accountID 
            FROM Comics.Account 
            WHERE username = $1
               OR email    = $2`, [nameOrPass, nameOrPass.toLowerCase()]);
        res.json({
            available: query.rowCount === 0
        });
    } catch (err) {
        next(err);
    }
});


router.get('/email/:email', checkAvalibility('Account', 'email'));
router.get('/username/:username', checkAvalibility('Account', 'username'));
router.get('/title/:title', checkAvalibility('Comic', 'title'));
router.get('/comicURL/:comicURL', checkAvalibility('Comic', 'comicURL'));

module.exports = router;