const firebase = require('../config/firebase')

module.exports = (req, res, next) => {
    try {
        const idToken = req.headers.authorization.split(' ')[1];

        firebase.auth().verifyIdToken(idToken)
        .then((decodedToken) => {
            req.userData = decodedToken;
            next();
        })
        .catch((error) => {
            console.error('Error verifying Firebase token:', error);
            return res.status(401).json({
                message: 'Unauthorized',
            });
        });
    } catch (error) {
        console.error('Error parsing token:', error);
        return res.status(401).json({
            message: 'Token Expired',
        });
    }
};
