const firebase = require('../config/firebase')
const firestore = firebase.firestore()

module.exports.signUp = async (req, res) => {
    const name = req.body.name
    const email = req.body.email
    const phoneNo = req.body.phoneNo
    const adminid = req.userData.uid

    firestore.collection('users').doc(adminid).get()
    .then(user => {
        if(user.exists && user.get('roleName') === "Admin"){

            if(user.get('plantID') === null || user.get('plantID') === undefined){
                return res.status(400).json({
                    message: "Please assign a plant to the admin before creating roles"
                })
            }

            firestore.collection('plants').doc(user.get('plantID')).get()
            .then(async plant => {
                if(plant.get('selectedAdmin')!==adminid){
                    return res.status(401).json({
                        message: "Admin is not associated with this plant"
                    })
                }

                const date = new Date()
                const newPassword = `${name.replace(/\s+/g, '').toLowerCase()}_${email}_Operator_3_${date.toISOString().replace(/\s+/g, '')}`
                console.log(newPassword);

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
                    postName: "Operator of STP",
                    roleName: "Operator",
                    plantID: user.get('plantID'),
                    phoneNo: phoneNo,
                    dateAdded: operator.metadata.creationTime
                })
                return newOperator
            })
            .then(newOperator => {
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

