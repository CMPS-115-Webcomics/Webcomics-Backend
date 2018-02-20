'use strict';
const db = require('../db');

const canModifyComic = async (req, res, next) => {
    const ownerQuery = await db.query('SELECT accountID from Comics.Comic WHERE comicID = $1', [req.body.comicID]);
    if (ownerQuery.rowCount === 0) {
        res.status(400)
            .send({
                error: 'No such comic',
                comicId: req.body.comicID
            });
        return;
    }
    if (ownerQuery.rows[0].accountid !== req.user.accountID && req.user.role === 'user') {
        res.status(403)
            .send({
                error: 'You don\'t have permission to edit that comic',
                comicId: req.body.comicID
            });
        return;
    }

    next();
};

const isModOrHigher = (req, res, next) => {
    if (req.user.role === 'user') {
        res.status(403)
            .send({
                error: 'You current role is not that of an admin or higher'
            });
        return;
    }
    next();
};

const makeAttributeValidator = params => {
    return (req, res, next) => {
        const missing = [];
        const body = req.body;
        for (const param of params) {
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
                message: 'Request lacks required parameter(s).',
                missing
            });
    };
};

module.exports = {
    requiredAttributes: makeAttributeValidator,
    canModifyComic,
    isMod: isModOrHigher
};
