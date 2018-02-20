'use strict';

const jwt = require('jsonwebtoken');
const db = require('./db');
const config = require('./config');

const emailVerificationExpirationTime = '7d';
const passwordResetExpirationTime = '1h';
const userTokenExpirationTime = '7d';

/**
 * Signs a JWT using the server's secret key
 *
 * @param {any} payload Data to be stored in the JWT
 * @param {string} expirationTime time until the JWT expires
 * @returns {string} Cryptographically signed JWT
 */
const signJWT = (payload, expirationTime) => {
    return jwt.sign(payload, config.jwtSecret, {
        expiresIn: expirationTime
    });
};

/**
 * Creats a JWT that allows authorzation to login to a given account with a given role
 *
 * @param {number} accountID Account number of user
 * @param {string} role user's role
 * @returns {string} Auth JWT
 */
const createUserToken = (accountID, role) => {
    return signJWT({
        accountID,
        role
    }, userTokenExpirationTime);
};

/**
 * Creates a JWT that authorizes a verification a given account's email
 *
 * @param {number} accountID ID of the account to verify
 * @returns {string} Email Verification JWT
 */
const createEmailVerificationToken = accountID => {
    return signJWT({
        accountID,
        email: true
    }, emailVerificationExpirationTime);
};

/**
 * Creates a JWT that authorizes a password reset on a given account
 *
 * @param {number} accountID ID of the account to reset
 * @returns {string} Password Reset JWT
 */
const createPasswordResetToken = accountID => {
    return signJWT({
        accountID,
        password: true
    }, passwordResetExpirationTime);
};

/**
 * A middleware that validates that a request has a valid JWT
 * If there is no valid  JWT it will be rejected with a 401.
 * if the JWT exists it will fill in req.user with the users info
 * Finally, if the user is banned, the request will be rejected with a 403
 *
 * @param {Request} req Express Request
 * @param {Responce} res Express Responce
 * @param {NextFunction} next Express NextFunction
 * @returns {void}
 */
const authorize = async (req, res, next) => {
    try {
        req.user = jwt.verify(req.header('token'), config.jwtSecret);
    } catch (e) {
        res.status(401)
            .send('Requires Authentication');
        return;
    }
    try {
        const bannedQuery = await db.query('SELECT banned FROM Comics.Account WHERE accountID = $1', [req.user.accountID]);
        const isBanned = bannedQuery.rows[0].banned;
        if (isBanned) {
            res.status(403)
                .send('The user is banned');
            return;
        }
    } catch (e) {
        next(e);
        return;
    }
    next();
};

module.exports = {
    createUserToken,
    createEmailVerificationToken,
    createPasswordResetToken,
    authorize
};
