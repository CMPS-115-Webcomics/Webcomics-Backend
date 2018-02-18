const passwords = require('./passwords');
const sgMail = require('@sendgrid/mail');
const config = require('./config');


sgMail.setApiKey(config.sendgridAPIKey);

const fromAddress = 'noreply@comichub.io';

async function sendPasswordResetEmail(targetEmail, accountID) {
    const token = passwords.createPasswordResetToken(accountID);
    const url = `https://comichub.io/reset/${token}`;
    try {
        await sgMail.send({
            to: targetEmail,
            from: fromAddress,
            subject: 'Password Reset',
            text: `You requested a password reset for ComicHub, change your password by visiting ${url}`,
            html: `
<p>You requested a password reset for ComicHub.</p>
<p>Change your password by clicking <a href="${url}" target="_blank">${url}</a>.</p>`,
        });
    } catch (err) {
        console.error(err);
    }
}

async function sendVerificationEmail(targetEmail, accountID) {
    const token = passwords.createEmailVerificationToken(accountID)
    const url = `https://comichub.io/verify/${token}`;
    try {
        await sgMail.send({
            to: targetEmail,
            from: fromAddress,
            subject: 'Email Verification',
            text: `Please verify your emaill address by visiting ${url}`,
            html: `
<p>Thank you for creating an account on ComicHub.</p>
<p>Please verify your emaill address by clicking <a href="${url}" target="_blank">${url}</a>.</p>`,
        });
    } catch (err) {
        console.error(err);
    }
}

module.exports = {
    sendVerificationEmail: sendVerificationEmail,
    sendPasswordResetEmail: sendPasswordResetEmail
}
