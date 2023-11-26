const firebase = require('../config/firebase')
const firestore = firebase.firestore()

module.exports.createPlant = (req,res) => {
    const superadminuid = req.userData.uid
    const city = req.body.city
    const isActive = req.body.isActive
    const pincode = req.body.pincode
    const plantAddress = req.body.plantAddress
    const plantCapacityinMLD = req.body.plantCapacityinMLD
    const state = req.body.state

    firestore.collection('users').doc(superadminuid).get()
    .then(user => {
        if(user.exists && user.get('roleName') === "superAdmin"){
            
        } else {
            return res.status(401).json({
                message: "Only a Super Admin can create plants"
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