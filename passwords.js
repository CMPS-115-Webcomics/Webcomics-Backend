'use strict';

const crypto = require('crypto');
const config = require('./config');


if (config.jwtSecret === 'TestSecret') {
  console.warn('No JWT_SECRET enviroment variable found. Using test secret. Do not use this in production.');
}

/**
 * Generates a cryptographically secure random string of a given length
 *
 * @param {number} length the length of the string to generate
 * @returns {string} a random string
 */
const genRandomString = function (length) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};


/**
 * Converts a password into a hash with salt in order to be securly stored
 *
 * @param {string} password The password to hash
 * @returns {{hash: string, salt:string}} A hashed form of the password along with the salt used to hash it
 */
const getHashedPassword = password => {
  const salt = genRandomString(32);
  return new Promise((fulfill, reject) => {
    crypto.pbkdf2(password, salt, 100000, 128, 'sha512', (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      fulfill({
        hash: derivedKey.toString('base64'),
        salt
      });
    });
  });
};

/**
 * Checks if a given password matches a stored hash.
 *
 * @param {string} candidate The password the user attempted
 * @param {string} hash The hash stored in the database
 * @param {string} salt The salt the password was hashed with
 * @returns {Promise<boolean>} A promise that resolves to true if the password was correct
 */
const checkPassword = (candidate, hash, salt) => {
  return new Promise((fulfill, reject) => {
    crypto.pbkdf2(candidate, salt, 100000, 128, 'sha512', (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      fulfill(derivedKey.toString('base64') === hash);
    });
  });
};

module.exports = {
  getHashedPassword,
  checkPassword
};
