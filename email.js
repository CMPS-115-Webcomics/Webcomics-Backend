const passwords = require('./passwords');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const fromAddress = 'noreply@comichub.io';

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
<p>Please verify your emaill address by clicking going to <a href="${url}" target="_blank">${url}</a>.</p>`,
        });
    } catch (err) {
        console.error(err);
    }
}

module.exports = {
    sendVerificationEmail: sendVerificationEmail
}