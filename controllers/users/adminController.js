const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const Email = require('../../mail/mailController')

module.exports.signUp = async (req, res) => {
    const name = req.body.name
    const email = req.body.email
    const phoneNo = req.body.phoneNo
    const postName = req.body.postName
    const plantID = req.body.plantID
    const superAdminId = req.userData.uid
    
    const requiredFields = ["name", "email", "phoneNo", "postName", "plantID"]

    // check if all the required fields are present by looping
    for(let i=0; i<requiredFields.length; i++){
        if(!req.body.hasOwnProperty(requiredFields[i])){
            return res.status(400).json({
                message: `${requiredFields[i]} is required`
            })
        } else if(typeof req.body[requiredFields[i]] !== "string"){
            return res.status(400).json({
                message: `${requiredFields[i]} should be a string`
            })
        } else if(req.body[requiredFields[i]].trim().length === 0){
            return res.status(400).json({
                message: `${requiredFields[i]} can't be empty`
            })
        }
    }

    // check if the email is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(email)) {
        return res.status(400).json({
            message: 'Email is not valid'
        })
    }

    // check if the phone number is valid
    const phoneRegex = /^[0-9]{10}$/;
    if(!phoneRegex.test(phoneNo)) {
        return res.status(400).json({
            message: 'Phone number is not valid'
        })
    }

    firestore.collection('users').doc(superAdminId).get()
    .then(async user => {
        if(user.exists && user.get('roleName') === "superAdmin"){
            const date = new Date()
            const newPassword = `${name.replace(/\s+/g, '').toLowerCase()}_${email}_Admin_1_${date.toISOString().replace(/\s+/g, '')}`
            
            const plant = await firestore.collection('plants').doc(plantID).get()

            if(!plant.exists){
                return res.status(404).json({
                    message: `Plant ${plantID} not found`
                })
            }

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
                    accessLevel: 1,
                    plantID: plantID
                })

                const newAdmin = await firestore.collection('users').doc(admin.uid).set({
                    accessLevel: 1,
                    isSuspended: false,
                    mailID: email, 
                    name: name,
                    postName: postName,
                    roleName: "Admin",
                    plantID: plantID,
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

    try {
        const user = firestore.collection('users').doc(adminuid).get()
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

module.exports.updateAdmin = async (req,res) => {
    const adminuid = req.userData.uid
    const updatedData = req.body.updateData

    const prohibitedFields = ["accessLevel", "mailID", "roleName", "isSuspended", "plantID", "dateAdded"]
    const updateableFields = ["name", "postName", "phoneNo"]

    // check if the updatedData object contains any prohibited fields
    for(let i=0; i<prohibitedFields.length; i++){
        if(updatedData.hasOwnProperty(prohibitedFields[i])){
            return res.status(400).json({
                message: `${prohibitedFields[i]} can't be updated`
            })
        }
    }

    // check if the updatedData object contains any updateable fields and if they are valid strings and non empty
    for(let i=0; i<updateableFields.length; i++){
        if(updatedData.hasOwnProperty(updateableFields[i])){
            if(typeof updatedData[updateableFields[i]] !== "string"){
                return res.status(400).json({
                    message: `${updateableFields[i]} should be a string`
                })
            } else if(updatedData[updateableFields[i]].trim().length === 0){
                return res.status(400).json({
                    message: `${updateableFields[i]} can't be empty`
                })
            }
        }
    }

    // check if the updatedData contains any fields which are not in updateableFields and in prohibitedFields
    for(let key in updatedData){
        if(!updateableFields.includes(key) && !prohibitedFields.includes(key)){
            return res.status(400).json({
                message: `${key} is not a valid field to update`
            })
        }
    }

    try {
        await firestore.collection('users').doc(adminuid).update(updatedData)

        return res.status(200).json({
            message: 'Admin updated successfully',
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.deleteAdmin = (req,res) => {
    const superadminuid = req.userData.uid
    const adminuid = req.params.adminuid

    firestore.collection('users').doc(superadminuid).get()
    .then(async user => {
        if(user.exists && user.get('roleName') === "superAdmin"){

            // find the admin to be deleted
            const admin = await firestore.collection('users').doc(adminuid).get()
            if(!admin.exists){
                return res.status(404).json({
                    message: "Admin not found"
                })
            }
            await firebase.auth().deleteUser(adminuid)
            
            await firestore.collection('users').doc(adminuid).delete()
            
            return res.status(200).json({
                message: 'User Deleted successfully',
            });

        } else {
            return res.status(401).json({
                message: "Only a super admin can delete users"
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
