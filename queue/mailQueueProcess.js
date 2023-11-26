const mailController = require('../mail/mailController')

const mailQueueProcess = async (job, done) => {
    const role = job.data.role
    const email = job.data.email
    const password = job.data.password

    try {
        await mailController.sendCredentialMail(role,email,password)
        done()
    } catch (error) {
        console.log(error);
        done(error)
    }
}

module.exports = mailQueueProcess
