const firebase = require('../config/firebase')
const firestore = firebase.firestore()

module.exports = (access, isIndustryAccessAllowed = false, isPlantAccessAllowed = true, isOnlySuperAdminAccessAllowed = false, isAllPlantRolesAllowed = false) => {
    return async (req, res, next) => {
        try {
            const useruid = req.userData.uid
            const user = await firestore.collection('users').doc(useruid).get()
            const roleName = req.userData.role
            const routeType = req.method

            if(isOnlySuperAdminAccessAllowed && roleName !== 'super admin'){
                return res.status(401).json({
                    message: "Only Super Admin access allowed"
                })
            }

            if(isAllPlantRolesAllowed && roleName !== 'industry'){
                return next()
            }

            if((roleName === 'super admin' || roleName === 'admin') && isPlantAccessAllowed){
                return next()
            } else if ((roleName === 'officer' || roleName === 'operator') && isPlantAccessAllowed){
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
