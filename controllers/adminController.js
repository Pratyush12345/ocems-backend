const firebase = require('../config/firebase')
const firestore = firebase.firestore()

module.exports.signUp = async (req, res) => {
    const name = req.body.name
    const email = req.body.email
    const phoneNo = req.body.phoneNo
    const superAdminId = req.userData.uid

    firestore.collection('users').doc(superAdminId).get()
    .then(user => {
        if(user.exists && user.get('roleName') === "superAdmin"){
            const date = new Date()
            const newPassword = `${name.replace(/\s+/g, '').toLowerCase()}_${email}_Cheif_1_${date.toISOString().replace(/\s+/g, '')}`
            console.log(newPassword);

            firebase.auth().createUser({
                email: email,
                password: newPassword,
                emailVerified: false,
                disabled: false
            })
            .then(async admin => {
                const newAdmin = await firestore.collection('users').doc(admin.uid).set({
                    accessLevel: 1,
                    isSuspended: false,
                    mailID: email, 
                    name: name,
                    postName: "Chief of STP",
                    roleName: "Admin",
                    plantID: "",
                    phoneNo: phoneNo,
                    dateAdded: admin.metadata.creationTime
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