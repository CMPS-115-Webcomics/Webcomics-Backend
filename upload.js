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

/**
 * Downscales an image to fit within a max x max size.
 * This will never upsize the image.
 *
 * @param {number} max The size to downscale to
 * @param {Buffer} buffer Buffer containing image data
 * @returns {Buffer} downscaled image data
 */
const downsize = (max, buffer) =>
    sharp(buffer)
    .resize(max, max)
    .max()
    .withoutEnlargement()
    .toBuffer();

/**
 * Transcodes an image intp wepb format
 *
 * @param {Buffer} buffer Image data to transcode
 * @return {Buffer} Webp image data
 */
const transcode = buffer =>
    sharp(buffer)
    .toFormat(sharp.format.webp)
    .toBuffer();

const mimtypes = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    webp: 'image/webp'
};

/**
 * Uploads a file to GCS
 *
 * @param {string} name The name of the file
 * @param {string} ext The file's extension
 * @param {Buffer} buffer  The file's data
 *
 * @returns {void}
 */
const uploadFile = (name, ext, buffer) => {
    const file = bucket.file(name);
    const stream = file.createWriteStream({
        metadata: {
            mimetype: mimtypes[ext]
        }
    });

    return new Promise((resolve, reject) => {
        stream.on('error', err => {
            reject(err);
        });

        stream.on('finish', () => {
            file.makePublic().then(() => {
                resolve();
            });
        });

        stream.end(buffer);
    });
};

const sizes = {
    small: 720,
    medium: 1280,
    high: 3840
};

const getNameInfo = name => {
    return {
        key: name.replace(/\.[^/.]+$/, ''),
        ext: name.split('.').pop()
    };
};

/**
 * Geneartes a middleware that will upload a submited image to Google Cloud Storage
 *
 * @param {boolean} multires True if the middleware should upload multiple resolutions of the image
 * @returns {function(Request, Response, NextFunction): void} Upload middleware
 */
const sendUploadToGCS = multires => async (req, res, next) => {
    if (!req.file) {
        return next();
    }

    try {
        const name = getNameInfo(Date.now() + req.file.originalname);
        req.file.fileKey = `${name.key}.${name.ext}`;

        if (multires) {
            for (const sizename in sizes) {
                const resized = await downsize(sizes[sizename], req.file.buffer);
                const transcoded = await transcode(resized);
                await uploadFile(`${name.key}-${sizename}.${name.ext}`, name.ext, resized);
                await uploadFile(`${name.key}-${sizename}.webp`, 'webp', transcoded);
            }
        } else {
            await uploadFile(`${name.key}.${name.ext}`, name.ext, req.file.buffer);
            await uploadFile(`${name.key}.webp`, 'webp', await transcode(req.file.buffer));
        }

        return next();
    } catch (err) {
        return next(err);
    }
};

const getURLs = (key, multires) => {
    const name = getNameInfo(key);

    if (!multires) {
        return [
            `${name.key}.${name.ext}`,
            `${name.key}.webp`
        ];
    }

    const urls = [];

    for (const sizename in sizes) {
        urls.push(`${name.key}-${sizename}.${name.ext}`);
        urls.push(`${name.key}-${sizename}.webp`);
    }

    return urls;
};

const deleteFromGCS = (filename, multires) => {
    for (const url of getURLs(filename, multires)) {
        bucket
            .file(url)
            .delete()
            .then(() => {
                console.log(`${url} deleted.`);
            })
            .catch(err => {
                console.error(`Failed to delete ${url} due to`, err);
            });
    }
};

module.exports = {
    sendUploadToGCS,
    deleteFromGCS,
    resizeTo,
    downsize,
    multer
};
