const db = require('../db');

function makeAviliblityValidator(table, attribute) {
    return async (req, res) => {
        try {
            const query = await db.query(`SELECT ${attribute} FROM Comics.${table} WHERE ${attribute}=$1`, [req.params[attribute]]);
            console.log(req.params, req.query[attribute], query.rowCount === 0)
            res.json({
                availbile: query.rowCount === 0
            });
        } catch (err) {
            console.error(err);
            res.sendStatus(500);
        }
    };
}

async function canModifyComic(req, res, next) {
    let ownerQuery = await db.query(`SELECT accountID from Comics.Comic WHERE comicID = $1`, [req.body.comicID]);
    if (ownerQuery.rowCount === 0) {
        req.status(400)
            .send({
                error: 'No such comic',
                comicId: req.body.comicID
            })
        return;
    }
    if (ownerQuery.rows[0].accountid !== req.user.accountID) {
        req.status(403)
            .send({
                error: 'You don\'t own that comic',
                comicId: req.body.comicID
            })
        return;
    }

    next()
}

function makeAttributeValidator(params) {
    return (req, res, next) => {
        let missing = [];
        let body = req.body;
        for (let param of params) {
            if (body[param] === undefined) {
                missing.push(param);
            }
        }
        if (missing.length === 0) {
            next();
            return;
        }
        res.status(400)
            .json({
                'message': 'Request lacks required parameter(s).',
                'missing': missing
            });
    }
}

module.exports = {
    availibilityRoute: makeAviliblityValidator,
    requiredAttributes: makeAttributeValidator,
    canModifyComic: canModifyComic
}