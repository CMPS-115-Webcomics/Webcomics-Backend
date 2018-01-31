const crypto = require('crypto');
const { StringDecoder } = require('string_decoder');
const decoder = new StringDecoder('base64');
const jwt = require('jsonwebtoken');



const genRandomString = function (length) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex') /** convert to hexadecimal format */
    .slice(0, length); /** return required number of characters */
};

const createUserToken = (accountID) => {
  return this.signJWT({accountID});
}

const createEmailVerificationToken = (accountID) => {
  return this.signJWT({accountID, email});
}
let secret;
if (process.env.JWT_SECRET) {
  secret = process.env.JWT_SECRET;
} else {
  secret = 'TestSecret';
  console.warn('No JWT_SECRET enviroment variable found. Using test secret. Do not use this in production.');
}

const needsAuth = (req, res, next) => {
  try {
      req.user = jwt.verify(req.header('token'), secret);
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
        hash: decoder.write(derivedKey),
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
      fulfill(decoder.write(derivedKey) === hash);
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