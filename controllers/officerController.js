const firebase = require('../config/firebase')
const firestore = firebase.firestore()
const Queue = require('bull');

const mailQueue = new Queue('mailQueue', {
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
        username: process.env.REDIS_USERNAME
    }
})

module.exports.signUp = async (req, res) => {
    const name = req.body.name
    const email = req.body.email
    const phoneNo = req.body.phoneNo
    const postName = req.body.postName
    const adminid = req.userData.uid

    firestore.collection('users').doc(adminid).get()
    .then(user => {
        if(user.exists && user.get('roleName') === "Admin"){

            if(user.get('plantID') === null || user.get('plantID') === undefined){
                return res.status(400).json({
                    message: "Please assign a plant to the admin before creating roles"
                })
            }
            
            let newPassword
            firestore.collection('plants').doc(user.get('plantID')).get()
            .then(async plant => {
                if(plant.get('selectedAdmin')!==adminid){
                    return res.status(401).json({
                        message: "Admin is not associated with this plant"
                    })
                }

                const date = new Date()
                newPassword = `${name.replace(/\s+/g, '').toLowerCase()}_${email}_Officer_2_${date.toISOString().replace(/\s+/g, '')}`

                const officer = await firebase.auth().createUser({
                    email: email,
                    password: newPassword,
                    emailVerified: false,
                    disabled: false
                })
                return officer
            })
            .then(async officer => {
                const newOfficer = await firestore.collection('users').doc(officer.uid).set({
                    accessLevel: 2,
                    isSuspended: false,
                    mailID: email, 
                    name: name,
                    postName: postName,
                    roleName: "Officer",
                    plantID: user.get('plantID'),
                    phoneNo: phoneNo,
                    dateAdded: officer.metadata.creationTime
                })
                return newOfficer
            })
            .then(async newOfficer => {
                await mailQueue.add({ role: "Officer", email: email, password: newPassword })

                return res.status(201).json({
                    message: "Officer created successfully"
                })
            })
            .catch(err => {
                console.log(err);
                return res.status(500).json({
                    error: err
                })
            })
        } else {
            return res.status(401).json({
                message: "Only an admin can add officers"
            })
        }
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}
