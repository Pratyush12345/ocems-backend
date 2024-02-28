const firebase = require('../../config/firebase')
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
        // set custom user claims
        await firebase.auth().setCustomUserClaims(superAdmin.uid, {
            role: "super admin",
            accessLevel: 0
        })

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

module.exports.getSuperAdmin = async (req,res) => {
    const superadminuid = req.userData.uid

    try {
        const user = await firestore.collection('users').doc(superadminuid).get()

        const userData = user.data();

        return res.status(200).json({
            admin: userData,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.updateSuperAdmin = async (req,res) => {
    const superadminuid = req.userData.uid
    const updatedData = req.body.updateData

    try {
        const user = await firestore.collection('users').doc(superadminuid).get()

        await user.ref.update(updatedData)

        return res.status(200).json({
            message: 'Super Admin updated successfully',
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.deleteSuperAdmin = async (req,res) => {
    const superadminuid = req.userData.uid

    try {
        const user = await firestore.collection('users').doc(superadminuid).get()

        await user.ref.delete()

        return res.status(200).json({
            message: 'Super Admin Deleted successfully',
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}