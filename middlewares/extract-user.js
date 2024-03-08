const firebase = require('../config/firebase')
const firestore = firebase.firestore()

// those routes which super admin access and doesn't require plantID 
const noPlantIDRoutes = [
    '/plant/create'
]

module.exports = async (req,res,next) => {
    try {
        const user = await firebase.auth().getUser(req.userData.uid)
        const customClaims = user.customClaims
        Object.keys(customClaims).forEach(key => {
            req.userData[key] = customClaims[key]
        })

        let plantID = req.userData.plantID ? req.userData.plantID : ""
        const roleName = req.userData.role
        
        if(roleName === "super admin"){
            const url = req._parsedUrl.pathname

            for (let i = 0; i < noPlantIDRoutes.length; i++) {
                const element = noPlantIDRoutes[i];

                if(url.includes(element)){
                    return next()
                }
            }

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
