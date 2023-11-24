const firebase = require('../config/firebase')
const firestore = firebase.firestore()

module.exports.updateUser = (req,res) => {
    const adminuid = req.userData.uid
    const useruid = req.params.useruid
    const updatedData = req.body.updateData

    if(updatedData["mailID"]!==undefined){
        return res.status(400).json({
            message: "You can't update email via this route"
        })
    }

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
                await firestore.collection('users').doc(useruid).update(updatedData)

                return res.status(200).json({
                    message: 'User updated successfully',
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
                message: "Only an admin can update users"
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
                await firebase.auth().deleteUser(useruid)
                
                await firestore.collection('users').doc(useruid).delete()
                
                return res.status(200).json({
                    message: 'User Deleted successfully',
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