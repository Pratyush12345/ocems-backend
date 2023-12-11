const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const Email = require('../../mail/mailController')

module.exports.signUp = async (req, res) => {
    const name = req.body.name
    const email = req.body.email
    const phoneNo = req.body.phoneNo
    const postName = req.body.postName
    const superAdminId = req.userData.uid

    firestore.collection('users').doc(superAdminId).get()
    .then(user => {
        if(user.exists && user.get('roleName') === "superAdmin"){
            const date = new Date()
            const newPassword = `${name.replace(/\s+/g, '').toLowerCase()}_${email}_Admin_1_${date.toISOString().replace(/\s+/g, '')}`

            firebase.auth().createUser({
                email: email,
                password: newPassword,
                emailVerified: false,
                disabled: false
            })
            .then(async admin => {

                // set custom user claims
                await firebase.auth().setCustomUserClaims(admin.uid, {
                    role: "admin",
                    accessLevel: 1
                })

                const newAdmin = await firestore.collection('users').doc(admin.uid).set({
                    accessLevel: 1,
                    isSuspended: false,
                    mailID: email, 
                    name: name,
                    postName: postName,
                    roleName: "Admin",
                    plantID: "",
                    phoneNo: phoneNo,
                    dateAdded: admin.metadata.creationTime
                })
                return newAdmin
            })
            .then(async newAdmin => {
                await Email.sendCredentialMail("Admin", email, newPassword)

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
        } else {
            return res.status(401).json({
                message: "Only a Super Admin can add Admins"
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

module.exports.getAdmin = (req,res) => {
    const adminuid = req.userData.uid

    firestore.collection('users').doc(adminuid).get()
    .then((adminDoc) => {
        if (!adminDoc.exists) {
            return res.status(404).json({
                message: 'Admin not found',
            });
        }

        const adminData = adminDoc.data();

        return res.status(200).json({
            admin: adminData,
        });
    })
    .catch((error) => {
        console.error('Error getting admin:', error);
        return res.status(500).json({
            message: 'Internal Server Error',
        });
    });
}

module.exports.updateAdmin = (req,res) => {
    const adminuid = req.userData.uid
    const updatedData = req.body.updateData

    firestore.collection('users').doc(adminuid).update(updatedData)
    .then(() => {
        return res.status(200).json({
            message: 'Admin updated successfully',
        });
    })
    .catch((error) => {
        console.error('Error updating user:', error);
        return res.status(500).json({
            message: 'Internal Server Error',
        });
    });
}

module.exports.deleteAdmin = (req,res) => {
    const superadminuid = req.userData.uid
    const adminuid = req.params.adminuid

    firestore.collection('users').doc(superadminuid).get()
    .then(async user => {
        if(user.exists && user.get('roleName') === "superAdmin"){

            await firebase.auth().deleteUser(adminuid)
            
            await firestore.collection('users').doc(adminuid).delete()
            
            return res.status(200).json({
                message: 'User Deleted successfully',
            });

        } else {
            return res.status(401).json({
                message: "Only an admin can delete users"
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
