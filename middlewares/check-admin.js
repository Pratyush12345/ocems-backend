const firebase = require('../config/firebase')

module.exports = (req, res, next) => {
    const adminuid = req.userData.uid

    firebase.auth().getUser(adminuid)
    .then(async admin => {
        if(admin.customClaims.accessLevel !== 1){
            return res.status(400).json({
                message: "Only an admin can access this route"
            })
        }
        next()
    })
    .catch(err => {
        console.log(err);
        return res.status(404).json({
            message: "Admin doesn't exist"
        })
    })
}