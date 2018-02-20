'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('./config');
const db = require('./db');

const emailVerificationExpirationTime = '7d';
const passwordResetExpirationTime = '1h';
const userTokenExpirationTime = '7d';

const secret = config.jwtSecret;
if (secret === 'TestSecret') {
  console.warn('No JWT_SECRET enviroment variable found. Using test secret. Do not use this in production.');
}

const genRandomString = function (length) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

const signJWT = (payload, expirationTime) => {
  return jwt.sign(payload, secret, {
    expiresIn: expirationTime
  });
};

const createUserToken = (accountID, role) => {
  return signJWT({
    accountID,
    role
  }, userTokenExpirationTime);
};

const createEmailVerificationToken = accountID => {
  return signJWT({
    accountID,
    email: true
  }, emailVerificationExpirationTime);
};

const createPasswordResetToken = accountID => {
  return signJWT({
    accountID,
    password: true
  }, passwordResetExpirationTime);
};

const needsAuth = async (req, res, next) => {
  try {
    req.user = jwt.verify(req.header('token'), secret);
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
  checkPassword,
  createUserToken,
  createEmailVerificationToken,
  createPasswordResetToken,
  authorize: needsAuth
};
