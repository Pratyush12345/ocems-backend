const firebase = require('../config/firebase')
const firestore = firebase.firestore()

module.exports = async (req,res,next) => {
    try {
        const user = await firebase.auth().getUser(req.userData.uid)
        const customClaims = user.customClaims
        
        Object.keys(customClaims).forEach(key => {
            req.userData[key] = customClaims[key]
        })

        next()
    } catch (error) {
        return res.status(500).json({
            message: "User doesn't exist"
        })
    }
}
