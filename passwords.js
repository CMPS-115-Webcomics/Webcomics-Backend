
const crypto = require('crypto');
const { StringDecoder } = require('string_decoder');
const decoder = new StringDecoder('base64');

const genRandomString = function (length) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex') /** convert to hexadecimal format */
    .slice(0, length); /** return required number of characters */
};

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
    checkPassword: checkPassword
}
