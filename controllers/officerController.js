const firebase = require('../config/firebase')
const firestore = firebase.firestore()

module.exports.signUp = async (req, res) => {
    const name = req.body.name
    const email = req.body.email
    const adminid = req.userData.uid

    firestore.collection('users').doc(adminid).get()
    .then(user => {
        if(user.exists && user.get('roleName') === "Admin"){

            if(user.get('plantID') === null || user.get('plantID') === undefined){
                return res.status(400).json({
                    message: "Please assign a plant to the admin before creating roles"
                })
            }

            firebase.auth().createUser({
                email: email,
                password: "officer",
                emailVerified: false,
                disabled: false
            })
            .then(async officer => {
                const newOfficer = await firestore.collection('users').doc(officer.uid).set({
                    accessLevel: 2,
                    isSuspended: false,
                    mailID: email, 
                    name: name,
                    postName: "Officer of STP",
                    roleName: "Officer",
                    plantID: user.get('plantID'),
                    phoneNo: "",
                    dateAdded: officer.metadata.creationTime
                })
                return newOfficer
            })
            .then(newOfficer => {
                return res.status(200).json({
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