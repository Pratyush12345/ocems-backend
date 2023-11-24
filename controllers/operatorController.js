const firebase = require('../config/firebase')
const firestore = firebase.firestore()

module.exports.signUp = async (req, res) => {
    const name = req.body.name
    const email = req.body.email
    const phoneNo = req.body.phoneNo
    const adminid = req.userData.uid

    firestore.collection('users').doc(adminid).get()
    .then(user => {
        if(user.exists && user.get('roleName') === "Admin"){

            if(user.get('plantID') === null || user.get('plantID') === undefined){
                return res.status(400).json({
                    message: "Please assign a plant to the admin before creating roles"
                })
            }

            firestore.collection('plants').doc(user.get('plantID')).get()
            .then(async plant => {
                if(plant.get('selectedAdmin')!==adminid){
                    return res.status(401).json({
                        message: "Admin is not associated with this plant"
                    })
                }

                const date = new Date()
                const newPassword = `${name.replace(/\s+/g, '').toLowerCase()}_${email}_Operator_3_${date.toISOString().replace(/\s+/g, '')}`
                console.log(newPassword);

                const operator = await firebase.auth().createUser({
                    email: email,
                    password: newPassword,
                    emailVerified: false,
                    disabled: false
                })
                return operator
            })
            .then(async operator => {
                const newOperator = await firestore.collection('users').doc(operator.uid).set({
                    accessLevel: 3,
                    isSuspended: false,
                    mailID: email, 
                    name: name,
                    postName: "Operator of STP",
                    roleName: "Operator",
                    plantID: user.get('plantID'),
                    phoneNo: phoneNo,
                    dateAdded: operator.metadata.creationTime
                })
                return newOperator
            })
            .then(newOperator => {
                return res.status(201).json({
                    message: "Operator created successfully"
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
                message: "Only an admin can add operators"
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

module.exports.getOperator = (req,res) => {
    const operatoruid = req.userData.uid

    firestore.collection('users').doc(operatoruid).get()
    .then((operatorDoc) => {
        if (!operatorDoc.exists) {
            return res.status(404).json({
                message: 'operator not found',
            });
        }

        const operatorData = operatorDoc.data();

        return res.status(200).json({
            admin: operatorData,
        });
    })
    .catch((error) => {
        console.error('Error getting operator:', error);
        return res.status(500).json({
            message: 'Internal Server Error',
        });
    });
}

module.exports.updateOperator = (req,res) => {
    const operatoruid = req.userData.uid
    const updatedData = req.body.updateData

    if(updatedData["mailID"]!==undefined){
        return res.status(400).json({
            message: "You can't update email via this route"
        })
    }

    firestore.collection('users').doc(operatoruid).update(updatedData)
    .then(() => {
        return res.status(200).json({
            message: 'operator updated successfully',
        });
    })
    .catch((error) => {
        console.error('Error updating user:', error);
        return res.status(500).json({
            message: 'Internal Server Error',
        });
    });
}

module.exports.deleteOperator = (req,res) => {
    const adminuid = req.userData.uid
    const operatoruid = req.params.operatoruid

    firestore.collection('users').doc(adminuid).get()
    .then(user => {
        if(user.exists && user.get('roleName') === "Admin"){

            if(user.get('plantID') === null || user.get('plantID') === undefined){
                return res.status(400).json({
                    message: "Please assign a plant to the admin before deleting users"
                })
            }
            
            firestore.collection('plants').doc(user.get('plantID')).get()
            .then(async plant => {
                if(plant.get('selectedAdmin')!==adminuid){
                    return res.status(401).json({
                        message: "Admin is not associated with this plant"
                    })
                }
                await firebase.auth().deleteUser(operatoruid)
                
                await firestore.collection('users').doc(operatoruid).delete()
                
                return res.status(200).json({
                    message: 'Operator Deleted successfully',
                });
            })
            .catch(err => {
                console.log(err);
                return res.status(500).json({
                    error: err
                })
            })
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