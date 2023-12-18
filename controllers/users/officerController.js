const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const Email = require('../../mail/mailController')

module.exports.signUp = async (req, res) => {
    const name = req.body.name
    const email = req.body.email
    const phoneNo = req.body.phoneNo
    const postName = req.body.postName
    const departmentAccess = req.body.departmentAccess
    const adminid = req.userData.uid

    // check if departmentAccess is an array
    if(!Array.isArray(departmentAccess)){
        return res.status(400).json({
            message: "Department Access should be an array"
        })
    }

    // check if departmentAccess is an array of strings
    if(!departmentAccess.every((value) => typeof value === 'string')){
        return res.status(400).json({
            message: "Department Access should be an array of strings"
        })
    }
    
    firestore.collection('users').doc(adminid).get()
    .then(user => {
        if(user.exists && user.get('roleName') === "Admin"){

            if(user.get('plantID') === null || user.get('plantID') === undefined){
                return res.status(400).json({
                    message: "Please assign a plant to the admin before creating roles"
                })
            }
            
            if(user.get('accessLevel') !== 1){
                return res.status(401).json({
                    message: "User does not have sufficient access level"
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
                newPassword = `${name.replace(/\s+/g, '').toLowerCase()}_${email}_Officer_2_${date.toISOString().replace(/\s+/g, '')}`

                const officer = await firebase.auth().createUser({
                    email: email,
                    password: newPassword,
                    emailVerified: false,
                    disabled: false
                })

                // set custom user claims
                await firebase.auth().setCustomUserClaims(officer.uid, {
                    role: "officer",
                    accessLevel: 2
                })
                
                return officer
            })
            .then(async officer => {
                const newOfficer = await firestore.collection('users').doc(officer.uid).set({
                    accessLevel: 2,
                    isSuspended: false,
                    mailID: email, 
                    name: name,
                    postName: postName,
                    roleName: "Officer",
                    plantID: user.get('plantID'),
                    phoneNo: phoneNo,
                    departmentAccess: departmentAccess,
                    dateAdded: officer.metadata.creationTime
                })
                return newOfficer
            })
            .then(async newOfficer => {
                await Email.sendCredentialMail("Officer", email, newPassword)

                return res.status(201).json({
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
