const firebase = require('../config/firebase')
const firestore = firebase.firestore()

module.exports.signUp = async (req, res) => {
    const name = req.body.name
    const email = req.body.email
    const password = req.body.password

    firebase.auth().createUser({
        email: email,
        password: password,
        emailVerified: false,
        disabled: false,
    })
    .then(async admin => {
        const newAdmin = await firestore.collection('users').doc(admin.uid).set({
            accessLevel: 1,
            isSuspended: false,
            mailID: email, 
            name: name,
            postName: "Chief of STP",
            roleName: "Admin",
            phoneNo: "",
            dateAdded: admin.metadata.creationTime,
        })
        return newAdmin
    })
    .then(newAdmin => {
        return res.status(201).json({
            message: "Admin created successfully"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}
