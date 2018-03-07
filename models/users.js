'use strict';

const {
    db
} = require('./db');
const passwords = require('./passwords');
const tokens = require('../tokens');
const email = require('../email');
const config = require('../config');

/**
 * Produces the results of a sucesful authorzation such as logging in or registering
 *
 * @param {number} accountID Id of account that logged in
 * @param {string} role Role of the user
 * @param {string} username Name of th user
 * @returns {{token: string, role:string, username:string}} a
 */
const authResponce = (accountID, role, username) => {
    return {
        token: tokens.createUserToken(accountID, role),
        username,
        role
    };
};

/**
 * Registers a new user
 *
 * @param {{username: string, password:string}} userdata The user's info
 * @param {string} role Role of the user
 * @param {boolean} shouldVerifyEmail True if the users email should be verified
 * @returns {Promise<{token: string, role:string, username:string}>} Auth data
 */
const create = async (userdata, role, shouldVerifyEmail) => {
    const givenRole = role || 'user';
    const userEmail = userdata.email.toLowerCase();
    const passwordData = await passwords.getHashedPassword(userdata.password);
    const queryResult = await db.query(`
        INSERT INTO Comics.Account (
            username,
            email,
            password,
            salt,
            role,
            emailVerified
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING accountID, role, email;`, [
        userdata.username,
        userEmail,
        passwordData.hash,
        passwordData.salt,
        givenRole, !shouldVerifyEmail
    ]);
    const result = queryResult.rows[0];
    if (shouldVerifyEmail) {
        email.sendVerificationEmail(userEmail, result.accountid);
    }
    return authResponce(result.accountid, result.role, userdata.username);
};

/**
 * Initilizes the user table.
 * Checks to see if an admin account exists, if none does
 * creates one using the info stored in config
 *
 * @returns {boolean} true if an account was created
 */
const initilize = async () => {
    const adminQuery = await db.query(`
        SELECT role FROM Comics.Account
        WHERE role = 'admin';`);
    if (adminQuery.rowCount !== 0) return false;
    console.log('Creating Admin User with default info (check config).');
    await create({
        username: config.admin.name,
        password: config.admin.password,
        email: config.admin.email
    }, 'admin', false);
    return true;
};

module.exports = {
    initilize,
    create
};
