const firebase = require('../config/firebase')
const firestore = firebase.firestore()
const IndustryRequest = firestore.collection('industriesRequest')
const Email = require('../mail/mailController')

const mailChecker = async (email) => {
    try {
        // checks all pending industries requests
        const industryRequestsMailCheck = await firestore.collection('industriesRequest').where('email', '==', email).get()
        if(!industryRequestsMailCheck.empty){
            return {
                code: 409,
                message: "Email already exists"
            }
        }

        // checks in authenticated emails
        const authEmailCheck = await firebase.auth().getUserByEmail(email)

        if(authEmailCheck.uid!==undefined){
            return {
                code: 409,
                message: "Email already exists"
            }
        }
        return null
    } catch (error) {
        if(error.code!=="auth/user-not-found"){
            console.log(error);
            return {
                code: 500,
                message: error
            }
        } 
    }
}

/**
 * Flow -> 
 * 1. Take industry details as input
 *      ~ Mail Id check
 *      ~ Plant id check
 *      ~ Add the industry in the industry collection with it's required recorded
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
    
    // Valid mail check ->
    const checkMail = await mailChecker(email)
    if(checkMail){
        return res.status(checkMail.code).json({
            message: checkMail.message
        })
    }

    // main logic
    firestore.collection('plants').doc(plantID).get()
    .then(async plantCheck => {
        if(!plantCheck.exists){
            return res.status(404).json({
                message: "Please enter a valid plant ID."
            })
        }

        const newIndustry = await firestore.collection(`${plantID}_industry_users`).add({
            IC_chamber_install: req.body.IC_chamber_install,
            address: req.body.address,
            approved: false,
            cetp_stp_etp_type: req.body.cetp_stp_etp_type,
            companyName: req.body.companyName,
            consentValidity: req.body.consentValidity,
            dateAdded: new Date().toUTCString(),
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
        await IndustryRequest.doc(newIndustry.id).set({
            isAccepted: false,
            plantID: plantID,
            email: email
        })

        // send response for request sent for review
        return res.status(200).json({
            message: "Request sent successfully for review to Plant Admin",
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
module.exports.getRequests = (req,res) => {
    const adminuid = req.userData.uid

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "admin not found"
            })
        }

        if(admin.get('accessLevel')!==1){
            return res.status(401).json({
                message: "Only admin can get industries"
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
    const adminuid = req.userData.uid

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "admin not found"
            })
        }

        if(admin.get('accessLevel')!==1){
            return res.status(401).json({
                message: "Only admin can get industries"
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
 *      ~ Create industry firebase account with custom password
 *      ~ Set custom claims to the industry account
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

        if(admin.get('accessLevel')!==1){
            return res.status(401).json({
                message: "Only admin can approve industries"
            })
        }

        // plant check for admin and industry
        const industryRequest = await firestore.collection('industriesRequest').doc(industryuid).get()
        const plantID = admin.get('plantID')

        if(industryRequest.get('plantID') !== plantID){
            return res.status(401).json({
                message: "Admin doesn't belong to the industries' selected plant"
            })
        }

        // create new industry firebase account
        const date = new Date()
        const password = `${industryuid}_${date.toISOString().replace(/\s+/g, '')}`

        const newIndustryAccount = await firebase.auth().createUser({
            email: industryRequest.get('email'),
            password: password,
            emailVerified: false,
            disabled: false
        })

        // set custom claim for plant id on industry
        await firebase.auth().setCustomUserClaims(newIndustryAccount.uid, {
            plantID: plantID,
            role: "industry"
        })

        // update industry approved field in plant's industry collection
        await firestore.collection(`${plantID}_industry_users`).doc(industryuid).update({
            approved: true
        })

        // remove industry request from the industriesRequest collection
        await firestore.collection('industriesRequest').doc(industryuid).delete()

        // send email with credentials
        await Email.sendCredentialMail("Industry", newIndustryAccount.email, password)

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

        if(admin.get('accessLevel')!==1){
            return res.status(401).json({
                message: "Only admin can reject industries"
            })
        }

        const industryRequest = await firestore.collection('industriesRequest').doc(industryuid).get()
        const plantID = admin.get('plantID')

        if(industryRequest.get('plantID') !== plantID){
            return res.status(401).json({
                message: "Admin doesn't belong to the industries' selected plant"
            })
        }
        
        // delete industry from plant's industry collection
        await firestore.collection(`${plantID}_industry_users`).doc(industryuid).delete()

        // remove industry request from the industriesRequest collection
        await firestore.collection('industriesRequest').doc(industryuid).delete()

        // send rejection email
        await Email.sendIndustryRejectionMail(industryRequest.get('email'))

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

        if(admin.get('accessLevel')!==1){
            return res.status(401).json({
                message: "Only admin can add industries"
            })
        }

        const plantID = admin.get('plantID')
        let counter=0

        for (let i = 0; i < industries.length; i++) {
            const industryElement = industries[i];

            // Valid mail check ->
            const checkMail = await mailChecker(industryElement.email)
            if(checkMail){
                continue
            }

            counter++
            // create firebase account of industry
            const industryAuth = await firebase.auth().createUser({
                email: industryElement.email,
                emailVerified: false,
                password: "industry",
                disabled: false,
            })
            
            // set password- setting this after because can't access uid before initialized
            const date = new Date()
            const password = `${industryAuth.uid}_${date.toISOString().replace(/\s+/g, '')}`

            await firebase.auth().updateUser(industryAuth.uid, {
                password: password
            })

            // set custom claim for plant id on industry
            await firebase.auth().setCustomUserClaims(industryAuth.uid, {
                plantID: plantID
            })

            // add creation date to industry json object 
            industryElement["dateAdded"]=industryAuth.metadata.creationTime
            
            // approve the industry
            industryElement["approved"]=true

            // add industry to plant's industry collection
            await firestore.collection(`${plantID}_industry_users`).add(industryElement)

            // send email of credentials
            await Email.sendCredentialMail("Industry", industryAuth.email, password)
        }

        return res.status(200).json({
            message: `Added ${counter} industries and sent ${counter} credential email(s)`
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

        if(admin.get('accessLevel')!==1){
            return res.status(401).json({
                message: "Only admin can delete industries"
            })
        }

        const plantID = admin.get('plantID')

        const industryFirestore = await firestore.collection(`${plantID}_industry_users`).doc(industryid).get()
        const industry = await firebase.auth().getUserByEmail(industryFirestore.get('email'))

        // delete industries firebase account
        await firebase.auth().deleteUser(industry.uid)

        // delete industry from plant's industry collection
        await firestore.collection(`${plantID}_industry_users`).doc(industryid).delete()

        // delete request from industry requests (if present)
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

/**
    DUMP
        // const Plants = await firestore.collection('plants').count().get()
        // const plantsCount = Plants.data().count

        // for (let i = 0; i < plantsCount; i++) {
        //     const mailCheck = await firestore.collection(`P${i}_industry_users`).where('email', '==', email).get()

        //     if(!mailCheck.empty){
        //         return res.status(409).json({
        //             message: "Email already exists"
        //         })
        //     }
        // }
 */