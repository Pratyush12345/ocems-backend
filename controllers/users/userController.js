const firebase = require('../../config/firebase')
const firestore = firebase.firestore()

module.exports.getUser = async (req,res) => {
    const useruid = req.params.uid

    try {
        const user = await firestore.collection('users').doc(useruid).get()

        if (!user.exists) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        return res.status(200).json({
            user: user.data(),
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.getUsers = async (req,res) => {
    const accessLevel = req.query.level
    const plantID = req.userData.plantID

    try {
        let query = firestore.collection('users').where('plantID', '==', plantID)

        if (accessLevel) {
            if(accessLevel === "0"){
                return res.status(400).json({
                    message: "Please provide a valid access level."
                })
            }
            query = query.where('accessLevel', '==', Number(accessLevel))
        }

        const usersDoc = await query.get()

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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.updateUser = async (req,res) => {
    const adminuid = req.userData.uid
    const useruid = req.params.useruid
    const updatedData = req.body.updateData
    const plantID = req.userData.plantID
    const roleName = req.userData.role

    try {
        if(useruid==="fcm_token"){
            const fcmToken = req.body.fcm_token
    
            if(!fcmToken){
                return res.status(400).json({
                    message: "Please provide a FCM Token"
                })
            }
    
            let query = ''

            if(roleName === 'industry')
                query = firestore.collection(`plants/${plantID}/industryUsers`).doc(`${req.userData.industryid}`)
            else 
                query = firestore.collection('users').doc(adminuid)
            
            await query.update({
                fcm_token: fcmToken
            })

            return res.status(200).json({
                message: "FCM Token updated successfully"
            })

        } else {
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
                    if(updateableFields[i] === 'departmentAccess'){
                        if(!Array.isArray(updatedData[updateableFields[i]])){
                            return res.status(400).json({
                                message: `departmentAccess should be an array`
                            })
                        } 
                    } else if(typeof updatedData[updateableFields[i]] !== "string"){
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

            await firestore.collection('users').doc(useruid).update(updatedData)
    
            return res.status(200).json({
                message: 'User updated successfully',
            });
    
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.deleteUser = async (req,res) => {
    const adminuid = req.userData.uid
    const useruid = req.params.useruid
    
    try {
        await firebase.auth().deleteUser(useruid)
                
        await firestore.collection('users').doc(useruid).delete()

        return res.status(200).json({
            message: 'User deleted successfully',
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.passwordReset = async (req,res) => {
    const useruid = req.userData.uid
    const password = req.body.password

    if(password.length<6){
        return res.status(400).json({
            message: "Password should have a length of at least 6"
        })
    }

    try {
        await firebase.auth().updateUser(useruid, {
            password: password
        })

        return res.status(200).json({
            message: "Password updated successfully"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}