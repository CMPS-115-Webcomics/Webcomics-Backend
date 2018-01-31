const express = require('express');
const router = express.Router();
const validators = require('./validators');

router.get('/email/:email', validators.availibilityRoute('Account', 'email'));
router.get('/username/:username', validators.availibilityRoute('Account', 'username'));
router.get('/title/:title', validators.availibilityRoute('Comic', 'title'));
router.get('/comicURL/:comicURL', validators.availibilityRoute('Comic', 'comicURL'));

module.exports = router;
