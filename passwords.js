const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('./config');
const db = require('../db');

const emailVerificationExpirationTime = "7d";
const passwordResetExpirationTime = "1h";
const userTokenExpirationTime = "7d";

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
}

const createUserToken = (accountID) => {
  return signJWT({
    accountID: accountID
  }, userTokenExpirationTime);
}

const createEmailVerificationToken = (accountID) => {
  return signJWT({
    accountID: accountID,
    email: true
  }, emailVerificationExpirationTime);
}

const createPasswordResetToken = (accountID) => {
  return signJWT({
    accountID: accountID,
    password: true
  }, passwordResetExpirationTime);
}

const needsAuth = (req, res, next) => {
  try {
    req.user = jwt.verify(req.header('token'), secret);
  } catch (e) {
    res.status(401)
      .send('Requires Authentication');
  }
  try {
    let bannedQuery = db.query(`SELECT banned FROM Comics.Account WHERE accountID = $1`, [req.user.accountID]);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
  const isBanned = bannedQuery.rows[0].banned;
  if (isBanned){
    res.status(403)
      .send('The user is banned');
  } else {
    next();
  }
}

const getHashedPassword = (password) => {
  const salt = genRandomString(32);
  return new Promise((fulfill, reject) => {
    crypto.pbkdf2(password, salt, 100000, 128, 'sha512', (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      fulfill({
        hash: derivedKey.toString('base64'),
        salt: salt
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
  getHashedPassword: getHashedPassword,
  checkPassword: checkPassword,
  createUserToken: createUserToken,
  createEmailVerificationToken: createEmailVerificationToken,
  createPasswordResetToken: createPasswordResetToken,
  authorize: needsAuth
}