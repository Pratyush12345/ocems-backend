const firebase = require('../config/firebase')

module.exports = (req, res, next) => {
    const admin = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"
    const super_admin = "1O7H2ayCNkVrl9OJ99AcEo8EZCf1"
    const operator = "vUrIGTroUiZ7SMMZP6c7N6hq6pD2"
    const officer = "a0DWQJxWv6W241iaGmk4jUk4Cqh2"
    const industry = "OvHYUewf1gYgsVHjSJCAeEQDDX32"
    
    req.userData = {}
    // req.userData.uid = super_admin;
    // req.userData.uid = admin;
    // req.userData.uid = officer;
    req.userData.uid = operator;
    // req.userData.uid = industry;
    return next()

    // try {
    //     const idToken = req.headers.authorization.split(' ')[1];

    //     firebase.auth().verifyIdToken(idToken)
    //     .then((decodedToken) => {
    //         req.userData = decodedToken;
    //         next();
    //     })
    //     .catch((error) => {
    //         console.error('Error verifying Firebase token:', error);
    //         return res.status(401).json({
    //             message: 'Unauthorized',
    //         });
    //     });
    // } catch (error) {
    //     console.error('Error parsing token:', error);
    //     return res.status(401).json({
    //         message: 'Token Expired',
    //     });
    // }
};
