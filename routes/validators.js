const db = require('../db');

async function canModifyComic(req, res, next) {
    let ownerQuery = await db.query(`SELECT accountID from Comics.Comic WHERE comicID = $1`, [req.body.comicID]);
    if (ownerQuery.rowCount === 0) {
        res.status(400)
            .send({
                error: 'No such comic',
                comicId: req.body.comicID
            })
        return;
    }
    if (ownerQuery.rows[0].accountid !== req.user.accountID && req.user.role === 'user') {
        res.status(403)
            .send({
                error: 'You don\'t have permission to edit that comic',
                comicId: req.body.comicID
            })
        return;
    }

    next()
}

async function isModOrHigher(req, res, next) {
    if (req.user.role === 'user') {
        res.status(403)
            .send({
                error: 'You current role is not that of an admin or higher'
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
    requiredAttributes: makeAttributeValidator,
    canModifyComic: canModifyComic
}