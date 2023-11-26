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
                newPassword = `${name.replace(/\s+/g, '').toLowerCase()}_${email}_Operator_3_${date.toISOString().replace(/\s+/g, '')}`

                const operator = await firebase.auth().createUser({
                    email: email,
                    password: newPassword,
                    emailVerified: false,
                    disabled: false
                })
                return operator
            })
            .then(async operator => {
                const newOperator = await firestore.collection('users').doc(operator.uid).set({
                    accessLevel: 3,
                    isSuspended: false,
                    mailID: email, 
                    name: name,
                    postName: postName,
                    roleName: "Operator",
                    plantID: user.get('plantID'),
                    phoneNo: phoneNo,
                    dateAdded: operator.metadata.creationTime
                })
                return newOperator
            })
            .then(async newOperator => {
                await mailQueue.add({ role: "Operator", email: email, password: newPassword })

                return res.status(201).json({
                    message: "Operator created successfully"
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
                message: "Only an admin can add operators"
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

