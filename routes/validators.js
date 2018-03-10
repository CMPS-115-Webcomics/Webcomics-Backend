'use strict';
const { db } = require('../models/db');

/**
 * Validates that a user has permission to modify a comic.
 * Users can modify comics if they are that comics owner or if they have moderator privillages.
 *
 * @param {Request} req Express request
 * @param {Response} res Express response
 * @param {NextFunction} next Next function
 * @returns {void}
 */
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

/**
 * Validates that a user has moderator privilages.
 * Both moderators and admins have moderator privliages
 *
 * @param {Request} req Express request
 * @param {Response} res Express response
 * @param {NextFunction} next Next function
 * @returns {void}
 */
const isModOrHigher = (req, res, next) => {
    if (req.user.role === 'user') {
        res.status(403)
            .send({
                error: 'You don\'t have moderator privilages'
            });
        return;
    }
    next();
};

/**
 * Verifies a request has a list of attributes
 *
 * @param {string[]} params Attributes which must be on the request body
 * @returns {function(Request, Response, NextFunction): void} a validator middleware coresponding to the required attributes
 */
const makeAttributeValidator = params => {
    return (req, res, next) => {
        const missing = [];
        for (const param of params) {
            if (req.body[param] === undefined) {
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
