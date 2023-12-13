const fs = require('fs')
const ejs = require('ejs')
const path = require('path')
const SibApiV3Sdk = require('@getbrevo/brevo');
let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

let apiKey = apiInstance.authentications['apiKey'];
apiKey.apiKey = process.env.BREVO_KEY

let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail(); 

const credentialsTemplate = fs.readFileSync(path.join(__dirname, './templates/credentials.ejs'), 'utf8')
const rejectionTemplate = fs.readFileSync(path.join(__dirname, './templates/rejection.ejs'), 'utf8')

module.exports.sendCredentialMail = async (role,email,password) => {
    const renderedHTML = ejs.render(credentialsTemplate, { role: role, email: email, password: password })

    try {
        sendSmtpEmail.subject = `Approval of Request for OCEMS ${role} Account`;
        sendSmtpEmail.htmlContent = renderedHTML;
        sendSmtpEmail.sender = {"name":"OCEMS","email":"superocems@gmail.com"};
        sendSmtpEmail.to = [{"email": email}];

        apiInstance.sendTransacEmail(sendSmtpEmail).then(function(data) {}, 
        function(error) {
            console.error(error);
        });
        
    } catch (error) {
        console.log(error);
        throw error
    }
}

module.exports.sendIndustryRejectionMail = async (email) => {
    const renderedHTML = ejs.render(rejectionTemplate)

    try {
        sendSmtpEmail.subject = `Rejection of Request for OCEMS industry Account`;
        sendSmtpEmail.htmlContent = renderedHTML;
        sendSmtpEmail.sender = {"name":"OCEMS","email":"superocems@gmail.com"};
        sendSmtpEmail.to = [{"email": email}];

        apiInstance.sendTransacEmail(sendSmtpEmail).then(function(data) {}, 
        function(error) {
            console.error(error);
        });
        
    } catch (error) {
        console.log(error);
        throw error
    }
}   
