const firebase = require('../config/firebase')
const firestore = firebase.firestore()

module.exports = async (req,res,next) => {
    try {
        const user = await firebase.auth().getUser(req.userData.uid)
        const customClaims = user.customClaims
        
        Object.keys(customClaims).forEach(key => {
            req.userData[key] = customClaims[key]
        })

        let plantID = req.userData.plantID ? req.userData.plantID : ""
        const roleName = req.userData.role
        if(roleName === 'super admin'){
            const plantIDRequest = req.query.plantID
                
            if(!plantIDRequest){
                return res.status(400).json({
                    message: "Please provide plantID"
                })
            }

            plantID = plantIDRequest
        } 
        const plant = await firestore.collection('plants').doc(plantID).get()

        if(!plant.exists){
            return res.status(404).json({
                message: `Plant ${plantID} not found`
            })
        }
        
        req.userData.plantID = plantID
        next()
    } catch (error) {
        return res.status(500).json({
            message: "User doesn't exist"
        })
    }
}
