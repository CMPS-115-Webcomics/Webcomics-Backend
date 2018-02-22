'use strict';

let json = {};
try {
    json = require('./config/config.json');
} catch (e) {
    json = {};
}

const config = {
    database: {
        user: json.SQL_USER || process.env.SQL_USER || 'postgres',
        database: json.SQL_DATABASE || process.env.SQL_DATABASE || 'postgres',
        password: json.SQL_PASSWORD || process.env.SQL_PASSWORD || 'postgres'
    },
    admin: {
        name: json.ADMIN_NAME || process.env.ADMIN_NAME || 'admin',
        password: json.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD,
        email: json.ADMIN_EMAIL || process.env.ADMIN_EMAIL
    },
    instanceConnecitonName: json.INSTANCE_CONNECTION_NAME || process.env.INSTANCE_CONNECTION_NAME,
    enviroment: process.env.NODE_ENV,
    cloudProject: json.GCLOUD_PROJECT || process.env.GCLOUD_PROJECT,
    cloudBucket: json.CLOUD_BUCKET || process.env.CLOUD_BUCKET,
    jwtSecret: json.JWT_SECRET || process.env.JWT_SECRET || 'TestSecret',
    googleCredentialPath: json.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS,
    sendgridAPIKey: json.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY
};

process.env.GOOGLE_APPLICATION_CREDENTIALS = config.googleCredentialPath;

module.exports = config;
