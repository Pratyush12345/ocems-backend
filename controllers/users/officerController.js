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
    
    const requiredFields = ["name", "email", "phoneNo", "postName", "departmentAccess"]

    for(let i=0; i<requiredFields.length; i++){
        if(!req.body.hasOwnProperty(requiredFields[i])){
            return res.status(400).json({
                message: `${requiredFields[i]} is required`
            })
        } else if(requiredFields[i] === "departmentAccess"){
            // check if departmentAccess is an array
            if(!Array.isArray(req.body[requiredFields[i]])){
                return res.status(400).json({
                    message: "Department Access should be an array"
                })
            } else if(!req.body[requiredFields[i]].every((value) => typeof value === 'string')){
                // check if departmentAccess is an array of strings
                return res.status(400).json({
                    message: "Department Access should be an array of strings"
                })
            }
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

    firestore.collection('users').doc(adminid).get()
    .then(user => {
        if(user.exists && user.get('roleName') === "Admin"){

            if(user.get('plantID') === null || user.get('plantID') === undefined || user.get('plantID') === ""){
                return res.status(400).json({
                    message: "Please assign a plant to the admin before creating roles"
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
                newPassword = `${name.replace(/\s+/g, '').toLowerCase().substring(0,3)}_${Math.floor(Math.random() * 900) + 100}_${date.getMilliseconds()}`

                const officer = await firebase.auth().createUser({
                    email: email,
                    password: newPassword,
                    emailVerified: false,
                    disabled: false
                })

                // set custom user claims
                await firebase.auth().setCustomUserClaims(officer.uid, {
                    role: "officer",
                    accessLevel: 2,
                    plantID: user.get('plantID')
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
                    dateAdded: officer.metadata.creationTime,
                    fcm_token: ""
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
