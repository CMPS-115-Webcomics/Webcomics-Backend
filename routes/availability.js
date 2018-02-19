const express = require('express');
const router = express.Router();
const validators = require('./validators');

router.get('/email/:email', validators.availabilityRoute('Account', 'email'));
router.get('/username/:username', validators.availabilityRoute('Account', 'username'));
router.get('/title/:title', validators.availabilityRoute('Comic', 'title'));
router.get('/comicURL/:comicURL', validators.availabilityRoute('Comic', 'comicURL'));

module.exports = router;
