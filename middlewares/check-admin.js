const firebase = require('../config/firebase')

module.exports = (req, res, next) => {
    // const adminuid = req.userData.uid
    const adminuid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"

    firebase.auth().getUser(adminuid)
    .then(admin => {
        if(admin.customClaims.role !== 'admin'){
            return res.status(400).json({
                message: "Only an admin can access this route"
            })
        }
        next()
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}