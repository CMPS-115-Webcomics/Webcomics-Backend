const Storage = require('@google-cloud/storage');
const Multer = require('multer');

const storage = Storage({
    projectId: process.env.GCLOUD_PROJECT
});
const bucket = storage.bucket(process.env.CLOUD_BUCKET);

const multer = Multer({
    storage: Multer.MemoryStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // no larger than 5mb
    }
});

function getPublicUrl(filename) {
    return `https://storage.googleapis.com/${process.env.CLOUD_BUCKET}/${filename}`;
}

function sendUploadToGCS(req, res, next) {
    if (!req.file) {
        return next();
    }

    const gcsname = Date.now() + req.file.originalname;
    const file = bucket.file(gcsname);

    const stream = file.createWriteStream({
        metadata: {
            contentType: req.file.mimetype
        }
    });

    stream.on('error', (err) => {
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
}

module.exports = {
    getPublicUrl,
    sendUploadToGCS,
    multer
};
