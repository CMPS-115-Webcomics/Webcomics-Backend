const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const expirationTime = 60 * 60;

let secret;
if (process.env.JWT_SECRET) {
  secret = process.env.JWT_SECRET;
} else {
  secret = 'TestSecret';
  console.warn('No JWT_SECRET enviroment variable found. Using test secret. Do not use this in production.');
}

const genRandomString = function (length) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

const signJWT = (payload) => {
  return jwt.sign(payload, secret, {
    expiresIn: expirationTime
  });
}

const createUserToken = (accountID) => {
  return signJWT({
    accountID: accountID
  });
}

const createEmailVerificationToken = (accountID) => {
  return signJWT({
    accountID: accountID,
    email: true
  });
}

const needsAuth = (req, res, next) => {
  try {
    req.user = jwt.verify(req.header('token'), secret);
    console.log('user', req.user); 
    next();
  } catch (e) {
    res.status(401)
      .send('Requires Authentication');
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
  authorize: needsAuth
}