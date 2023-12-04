const firebase = require('../config/firebase')
const firestore = firebase.firestore()
const IndustryRequest = firestore.collection('industriesRequest')
const Email = require('../mail/mailController')

/**
 * Flow -> 
 * 1. Take industry details as input
 *      ~ Plant ID check
 *      ~ Add in the authentication db the email of the industry and generate uid
 *      ~ Add the industry with the uid in the industry collection with it's required recorded
 *      ~ Add the industry request to industriesRequest collection
 * 2. Industry req checked by admin
 * 3. if ok -> add to industy collection and send credentials mail
 * 4. else ->
 *      ~ Remove from authentication db
 *      ~ Remove from industry collection
 *      ~ Send cancellation mail of request mail
 */
module.exports.signUp = async (req,res) => {
    const email = req.body.email
    const plantID = req.body.plantID
    
    firebase.auth().createUser({
        email: email,
        emailVerified: false,
        password: "industry",
        disabled: false,
    })
    .then(async industryAuth => {
        // Valid plant ID check
        const plantCheck = await firestore.collection('plants').doc(plantID).get()

        if(!plantCheck.exists){
            return res.status(404).json({
                message: "Please enter a valid plant ID."
            })
        }

        // add to plant's industry users collection
        await firestore.collection(`${plantID}_industry_users`).doc(industryAuth.uid).set({
            IC_chamber_install: req.body.IC_chamber_install,
            address: req.body.address,
            approved: false,
            cetp_stp_etp_type: req.body.cetp_stp_etp_type,
            companyName: req.body.companyName,
            consentValidity: req.body.consentValidity,
            dateAdded: industryAuth.metadata.creationTime,
            domesticEffluent: req.body.domesticEffluent,
            email: req.body.email,
            h_n_type: req.body.h_n_type,
            phase: req.body.phase,
            phoneNo: req.body.phoneNo,
            pincode: req.body.pincode,
            plantID: req.body.plantID,
            pno: req.body.pno,
            remark: req.body.remark,
            totalEffluentTradeAndUtility: req.body.totalEffluentTradeAndUtility,
            unitId: req.body.unitId,
        })

        // add industry to industriesRequest collection for admin approvals
        await IndustryRequest.doc(industryAuth.uid).set({
            isAccepted: false,
            plantID: plantID
        })

        // send response for request sent for review
        return res.status(200).json({
            message: "Request sent successfully for review to Plant Admin",
        })
    })
    .catch(err => {
        console.log(err);
        if(err.code === "auth/email-already-exists"){
            return res.status(409).json({
                message: err.message
            })
        }
        return res.status(500).json({
            error: err
        })
    })
}

// returns all industries of a plant using admin's id
module.exports.getRequests = (req,res) => {
    const adminuid = req.userData.uid

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "admin not found"
            })
        }
        const plantID = admin.get('plantID')
        const requests = await firestore.collection(`${plantID}_industry_users`).where('approved', '==', true).get()
        
        const industries = [];
        requests.forEach((doc) => {
            industries.push({
                id: doc.id,
                data: doc.data()
            });
        });

        return res.status(200).json({
            industries: industries
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

// returns all industries of a plant using admin's id
module.exports.getUnapprovedRequests = (req,res) => {
    // const adminuid = req.userData.uid
    const adminuid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "admin not found"
            })
        }
        const plantID = admin.get('plantID')
        const requests = await firestore.collection(`${plantID}_industry_users`).where('approved', '==', false).get()
        
        const industries = [];
        requests.forEach((doc) => {
            industries.push({
                id: doc.id,
                data: doc.data()
            });
        });

        return res.status(200).json({
            industries: industries
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

/**
 *  On request approval
 *      ~ Error checking
 *      ~ Set custom claims
 *      ~ Set password for industry's account
 *      ~ Update plant's industries collection and set approved to true
 *      ~ Remove request from industriesRequest
 *      ~ Send email with credentials
 */
module.exports.approveRequest = (req,res) => {
    const industryuid = req.params.uid
    const adminuid = req.userData.uid

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        // Error checking
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        const industryRequest = await firestore.collection('industriesRequest').doc(industryuid).get()
        const plantID = admin.get('plantID')

        if(industryRequest.get('plantID') !== plantID){
            return res.status(401).json({
                message: "Admin doesn't belong to the industries' selected plant"
            })
        }

        // set custom claim for plant id on industry
        await firebase.auth().setCustomUserClaims(industryuid, {
            plantID: plantID
        })

        // set password
        const date = new Date()
        const password = `${industryuid}_${date.toISOString().replace(/\s+/g, '')}`

        await firebase.auth().updateUser(industryuid, {
            password: password
        })
        
        // update industry approved field in plant's industry collection
        await firestore.collection(`${plantID}_industry_users`).doc(industryuid).update({
            approved: true
        })

        // remove industry request from the industriesRequest collection
        await firestore.collection('industriesRequest').doc(industryuid).delete()

        // send email with credentials
        const industry = await firebase.auth().getUser(industryuid)
        await Email.sendCredentialMail("Industry", industry.email, password)

        return res.status(200).json({
            message: "Industry approved and credential mail sent"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

/**
 * On rejecting a request
 *      ~ Error checking
 *      ~ Delete industry firebase account
 *      ~ Delete industry acceptance request
 *      ~ Delete industry from plant's industry collection
 *      ~ Send rejection email
 */
module.exports.rejectRequest = (req,res) => {
    const industryuid = req.params.uid
    const adminuid = req.userData.uid

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        const industryRequest = await firestore.collection('industriesRequest').doc(industryuid).get()
        const plantID = admin.get('plantID')

        if(industryRequest.get('plantID') !== plantID){
            return res.status(401).json({
                message: "Admin doesn't belong to the industries' selected plant"
            })
        }

        // delete industries' firebase account
        const industry = await firebase.auth().getUser(industryuid)
        await firebase.auth().deleteUser(industryuid)
        
        // delete industry from plant's industry collection
        await firestore.collection(`${plantID}_industry_users`).doc(industryuid).delete()

        // remove industry request from the industriesRequest collection
        await firestore.collection('industriesRequest').doc(industryuid).delete()

        // send rejection email
        await Email.sendIndustryRejectionMail(industry.email)

        return res.status(200).json({
            message: "Industry Rejected and rejection mail sent"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

/**
 * No approval or rejection required
 * For bulk upload:
 *      ~ Get all industries data in form of an array
 *      ~ Error checking
 *      ~ Set custom claims
 *      ~ Set password for industry's firebase account
 *      ~ Add to plant's industries collection with approved to true
 *      ~ Send email with credentials
 */
module.exports.bulkUpload = (req,res) => {
    const industries = req.body.industries
    const adminuid = req.userData.uid

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        const plantID = admin.get('plantID')

        for (let i = 0; i < industries.length; i++) {
            const industryElement = industries[i];
            
            // create firebase account of industry
            const industryAuth = await firebase.auth().createUser({
                email: industryElement.email,
                emailVerified: false,
                password: "industry",
                disabled: false,
            })

            // add creation date to industry json object 
            industryElement["dateAdded"]=industryAuth.metadata.creationTime
            
            // approve the industry
            industryElement["approved"]=true

            // add industry to plant's industry collection
            await firestore.collection(`${plantID}_industry_users`).doc(industryAuth.uid).set(industryElement)

            // set custom claim for plant id on industry
            await firebase.auth().setCustomUserClaims(industryAuth.uid, {
                plantID: plantID
            })
            
            // set password
            const date = new Date()
            const password = `${industryAuth.uid}_${date.toISOString().replace(/\s+/g, '')}`

            await firebase.auth().updateUser(industryAuth.uid, {
                password: password
            })

            // send email of credentials
            await Email.sendCredentialMail("Industry", industryAuth.email, password)
        }

        return res.status(200).json({
            message: `Added ${industries.length} industries and sent credential email(s)`
        })
       
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

// Normal function to delete an industry based on the admin's uid (to get the plant collection)
module.exports.deleteIndustry = (req,res) => {
    const industryid = req.params.uid
    const adminuid = req.userData.uid

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        const plantID = admin.get('plantID')

        await firebase.auth().deleteUser(industryid)
        await firestore.collection(`${plantID}_industry_users`).doc(industryid).delete()
        await IndustryRequest.doc(industryid).delete()

        return res.status(200).json({
            message: "Industry deleted"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}
