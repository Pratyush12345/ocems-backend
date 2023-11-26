const fs = require('fs')
const ejs = require('ejs')
const path = require('path')
const nodemailer = require('nodemailer')
const { google } = require('googleapis')
const Queue      = require('bull');

const mailQueue = new Queue('mailQueue', {
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
        username: process.env.REDIS_USERNAME
    }
})

const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
)

oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

const credentialsTemplate = fs.readFileSync(path.join(__dirname, './credentials.ejs'), 'utf8')

module.exports.sendCredentialMail = async (role,email,password) => {
    const renderedHTML = ejs.render(credentialsTemplate, { role: role, email: email, password: password })

    try {
        const accessToken = await oAuth2Client.getAccessToken();

        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: 'superocems@gmail.com',
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
                accessToken: accessToken
            }
        })

        const mailOptions = {
            from: 'OCEMS <superocems@gmail.com>',
            to: email,
            subject: `Login credentials for OCEMS ${role} Account`,
            html: renderedHTML
        }

        await transport.sendMail(mailOptions)
        
    } catch (error) {
        console.log(error);
        throw error
    }
}

// DUMP

// const formData = require('form-data');
// const Mailgun = require('mailgun.js');
// const mailgun = new Mailgun(formData);
// const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY});

// module.exports.sendCredentialMail = async (role, email, password) => {
//     const renderedHTML = ejs.render(credentialsTemplate, { role: role, email: email, password: password })

//     mg.messages.create(process.env.MAILGUN_DOMAIN, {
//         from: "OCEMS <mridulverma478@gmail.com>",
//         to: [email],
//         subject: `Login credentials for OCEMS ${role} Account`,
//         html: renderedHTML
//     })
//     .then(msg => {
//         console.log("Mail Sent");
//     }) 
//     .catch(err => console.error(err)); 
// }