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
    .then(async superAdmin => {
        const newsuperAdmin = await firestore.collection('users').doc(superAdmin.uid).set({
            accessLevel: 0,
            isSuspended: false,
            mailID: email, 
            name: name,
            postName: "Super Admin",
            roleName: "superAdmin",
            phoneNo: "",
            dateAdded: superAdmin.metadata.creationTime,
        })
        return newsuperAdmin
    })
    .then(newsuperAdmin => {
        return res.status(201).json({
            message: "Super Admin created successfully"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}
