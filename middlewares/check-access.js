const firebase = require('../config/firebase')
const firestore = firebase.firestore()

module.exports = (access, routeType, isIndustryAccessAllowed = false) => {
    return async (req, res, next) => {
        try {
            const useruid = req.userData.uid
            const user = await firestore.collection('users').doc(useruid).get()
            const roleName = req.userData.role

            if(roleName === 'super admin'){
                const plantID = req.body.plantID
                
                if(!plantID){
                    return res.status(400).json({
                        message: "Please provide a plantID"
                    })
                }
                
                const plant = await firestore.collection('plants').doc(plantID).get()
                
                if(!plant.exists){
                    return res.status(404).json({
                        message: `Plant ${plantID} not found`
                    })
                }
                
                req.userData.plantID = plantID
                return next()
            } else if (roleName === 'admin'){
                return next()
            } else if (roleName === 'officer' || roleName === 'operator'){
                const departmentAccess = user.get('departmentAccess')

                if(!departmentAccess.includes('All')){
                    let allowedAccess = routeType === 'GET' ? access.read : access.write
                    let flag = departmentAccess.some(accessLevel => allowedAccess.includes(accessLevel))

                    if(flag){
                        return next()
                    } else {
                        return res.status(400).json({
                            message: `${roleName.toUpperCase()} doesn't have ${routeType === 'GET' ? 'READ' : "WRITE"} access to this route`
                        })
                    }          
                } else {
                    return next()
                }
            } else if (roleName === 'industry'){
                if(isIndustryAccessAllowed){
                    return next()
                } else {
                    return res.status(401).json({
                        message: "Industry access not allowed for this route"
                    })
                }
            } else {
                return res.status(401).json({
                    message: "Unauthorized access"
                })
            }
        } catch (error) {
            console.error(error)
            return res.status(500).json({
                error: error.message || "An error occurred during the access check."
            })
        }
    }
}
