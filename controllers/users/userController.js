const firebase = require('../../config/firebase')
const firestore = firebase.firestore()

module.exports.getUser = (req,res) => {
    const useruid = req.params.uid

    firestore.collection('users').doc(useruid).get()
    .then((userDoc) => {
        if (!userDoc.exists) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        return res.status(200).json({
            user: userDoc.data(),
        });
    })
    .catch((error) => {
        console.error(error);
        return res.status(500).json({
            message: 'Internal Server Error',
        });
    });
}

module.exports.getUsers = (req,res) => {
    const accessLevel = req.query.level
    const plantID = req.query.plantID

    if(plantID===undefined){
        return res.status(400).json({
            message: "Please provide a plant ID."
        })
    }

    let query = firestore.collection('users').where('plantID', '==', plantID)

    if (accessLevel !== undefined) {
        if(accessLevel === "0"){
            return res.status(400).json({
                message: "Please provide a valid access level."
            })
        }
        query = query.where('accessLevel', '==', Number(accessLevel))
    }

    query.get()
    .then((usersDoc) => {
        if (usersDoc.empty) {
            return res.status(404).json({
                message: 'Users not found',
            });
        }

        const users = [];
        usersDoc.forEach((doc) => {
            users.push({
                id: doc.id,
                data: doc.data(),
            });
        });

        return res.status(200).json({
            users: users,
        });
    })
    .catch((error) => {
        console.error(error);
        return res.status(500).json({
            message: 'Internal Server Error',
        });
    });
}

module.exports.updateUser = (req,res) => {
    const adminuid = req.userData.uid
    const useruid = req.params.useruid
    const updatedData = req.body.updateData

    const prohibitedFields = ["accessLevel", "mailID", "roleName", "isSuspended", "plantID", "dateAdded"]
    const updateableFields = ["name", "postName", "phoneNo", "departmentAccess"]

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

    firestore.collection('users').doc(adminuid).get()
    .then(async user => {
        const roleName = user.get('roleName')

        if(user.exists){

            if(roleName !== "Admin" && roleName !== "superAdmin"){
                return res.status(401).json({
                    message: "Unauthorized access"
                })
            }

            if(roleName === "Admin"){
                if(user.get('plantID') === null || user.get('plantID') === undefined){
                    return res.status(400).json({
                        message: "Please assign a plant to the admin before deleting users"
                    })
                }
                
                const plant = await firestore.collection('plants').doc(user.get('plantID')).get()
                if(plant.get('selectedAdmin')!==adminuid){
                    return res.status(401).json({
                        message: "Admin is not associated with this plant"
                    })
                }
            } 

            await firestore.collection('users').doc(useruid).update(updatedData)

            return res.status(200).json({
                message: 'User updated successfully',
            });
        } else {
            return res.status(404).json({
                message: "Admin Doesn't exist"
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

module.exports.deleteUser = (req,res) => {
    const adminuid = req.userData.uid
    const useruid = req.params.useruid

    firestore.collection('users').doc(adminuid).get()
    .then(async user => {
        const roleName = user.get('roleName')

        if(user.exists){

            if(roleName !== "Admin" && roleName !== "superAdmin"){
                return res.status(401).json({
                    message: "Unauthorized access"
                })
            }

            if(roleName === "Admin"){
                if(user.get('plantID') === null || user.get('plantID') === undefined){
                    return res.status(400).json({
                        message: "Please assign a plant to the admin before deleting users"
                    })
                }
                
                const plant = await firestore.collection('plants').doc(user.get('plantID')).get()
                if(plant.get('selectedAdmin')!==adminuid){
                    return res.status(401).json({
                        message: "Admin is not associated with this plant"
                    })
                }
            } 

            await firebase.auth().deleteUser(useruid)
                
            await firestore.collection('users').doc(useruid).delete()

            return res.status(200).json({
                message: 'User deleted successfully',
            });

        } else {
            return res.status(404).json({
                message: "Admin Doesn't exist"
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

module.exports.passwordReset = (req,res) => {
    const useruid = req.userData.uid
    const password = req.body.password

    if(password.length<6){
        return res.status(400).json({
            message: "Password should have a length of at least 6"
        })
    }

    firebase.auth().updateUser(useruid, {
        password: password
    })
    .then(result => {
        return res.status(200).json({
            message: "Password updated successfully"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}