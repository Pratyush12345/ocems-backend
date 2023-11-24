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

module.exports.getSuperAdmin = (req,res) => {
    const superadminuid = req.userData.uid

    firestore.collection('users').doc(superadminuid).get()
    .then((superAdminDoc) => {
        if (!superAdminDoc.exists) {
            return res.status(404).json({
                message: 'Super Admin not found',
            });
        }

        const superAdminData = superAdminDoc.data();

        return res.status(200).json({
            admin: superAdminData,
        });
    })
    .catch((error) => {
        console.error('Error getting super admin:', error);
        return res.status(500).json({
            message: 'Internal Server Error',
        });
    });
}

module.exports.updateSuperAdmin = (req,res) => {
    const superadminuid = req.userData.uid
    const updatedData = req.body.updateData

    firestore.collection('users').doc(superadminuid).update(updatedData)
    .then(() => {
        return res.status(200).json({
            message: 'Super Admin updated successfully',
        });
    })
    .catch((error) => {
        console.error('Error updating user:', error);
        return res.status(500).json({
            message: 'Internal Server Error',
        });
    });
}

module.exports.deleteSuperAdmin = (req,res) => {
    const superadminuid = req.userData.uid

    firestore.collection('users').doc(superadminuid).delete()
    .then(() => {
        return res.status(200).json({
            message: 'Super Admin Deleted successfully',
        });
    })
    .catch((error) => {
        console.error('Error updating user:', error);
        return res.status(500).json({
            message: 'Internal Server Error',
        });
    });
}