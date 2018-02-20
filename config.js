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
    enviroment: process.env.NODE_ENV,
    cloudProject: json.GCLOUD_PROJECT || process.env.GCLOUD_PROJECT,
    cloudBucket: json.CLOUD_BUCKET || process.env.CLOUD_BUCKET,
    jwtSecret: json.JWT_SECRET || process.env.JWT_SECRET || 'TestSecret',
    googleCredentialPath: json.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS,
    sendgridAPIKey: json.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY
}

process.env.GOOGLE_APPLICATION_CREDENTIALS = config.googleCredentialPath;

module.exports = config;