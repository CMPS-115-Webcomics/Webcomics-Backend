'use strict';

const Storage = require('@google-cloud/storage');
const Multer = require('multer');
const config = require('./config');
const sharp = require('sharp');

const storage = Storage({
    projectId: config.cloudProject
});
const bucket = storage.bucket(config.cloudBucket);

const multer = Multer({
    storage: Multer.MemoryStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // no larger than 5mb
    }
});

const getPublicUrl = filename => {
    return `https://storage.googleapis.com/${config.cloudBucket}/${filename}`;
};

const resizeTo = (width, height) => async (req, res, next) => {
    if (!req.file) {
        next();
        return;
    }
    try {
        req.file.buffer = await sharp(req.file.buffer)
            .resize(width, height)
            .ignoreAspectRatio()
            .withoutEnlargement()
            .toBuffer();
        next();
        return;
    } catch (err) {
        next(err);
        return;
    }
};

const sendUploadToGCS = (req, res, next) => {
    if (!req.file) {
        next();
        return;
    }

    const gcsname = Date.now() + req.file.originalname;
    const file = bucket.file(gcsname);

    const stream = file.createWriteStream({
        metadata: {
            contentType: req.file.mimetype
        }
    });

    stream.on('error', err => {
        req.file.cloudStorageError = err;
        next(err);
    });

    stream.on('finish', () => {
        req.file.cloudStorageObject = gcsname;
        file.makePublic().then(() => {
            req.file.cloudStoragePublicUrl = getPublicUrl(gcsname);
            next();
        });
    });

    stream.end(req.file.buffer);
};

const deleteFromGCS = filename => {
    bucket
        .file(filename)
        .delete()
        .then(() => {
            console.log(`gs://${config.cloudBucket}/${filename} deleted.`);
        })
        .catch(err => {
            console.error('ERROR:', err);
        });
};

module.exports = {
    getPublicUrl,
    sendUploadToGCS,
    deleteFromGCS,
    resizeTo,
    multer
};
