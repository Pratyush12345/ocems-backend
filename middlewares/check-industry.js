const firebase = require('../config/firebase')

module.exports = (req, res, next) => {
    const industryuid = req.userData.uid

    firebase.auth().getUser(industryuid)
    .then(industry => {
        if(industry.customClaims.role !== 'industry'){
            return res.status(400).json({
                message: "Only an industry can access this route"
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