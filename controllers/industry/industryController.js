const { K } = require('handlebars')
const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const IndustryRequest = firestore.collection('industriesRequest')
const Email = require('../../mail/mailController')
const Excel = require('exceljs')
const fs = require('fs')

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

        if(authEmailCheck.uid){
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

        const newIndustry = await firestore.collection(`plants/${plantID}/industryUsers`).add({
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
            fcm_token: "",
            isActive: 1,
            apiID: req.body.apiID ? req.body.apiID : null
        })

        // add industry to industriesRequest collection for admin approvals
        await IndustryRequest.doc(newIndustry.id).set({
            isAccepted: false,
            plantID: plantID,
            email: email
        })

        // send notification to admin
        const admin = await firestore.collection('users').doc(plantCheck.get('selectedAdmin')).get()
        const fcm_token = admin.get('fcm_token')
        
        if(fcm_token){
            try {
                const message = {
                    notification: {
                        title: "New Industry Request",
                        body: `A new industry has requested to join your plant.`
                    },
                    token: fcm_token
                }
        
                await firebase.messaging().send(message)
                
            } catch (error) {
                console.log("Notification not sent");
            }    
        }
        
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

module.exports.getIndustryName = async (req,res) => {
    const plantID = req.userData.plantID
    const industryid = req.params.uid

    try {
        const industry = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()
        if(!industry.exists){
            return res.status(404).json({
                message: "Industry not found"
            })
        }

        return res.status(200).json({
            industry: {
                id: industry.id,
                data: {
                    name: industry.get('companyName'),
                    address: industry.get('address')
                }
            }
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }
}
 
// returns all industries of a plant using admin's id
module.exports.getRequests = async (req,res) => {
    const plantID = req.userData.plantID
    const roleName = req.userData.role
    let industryid = req.query.id
    
    if(roleName === "industry"){
        if(industryid){
            return res.status(400).json({
                message: "Industryid not allowed"
            })
        }
        industryid = req.userData.industryid
    } 

    try {
        if(industryid){
            const industry = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()
            if(!industry.exists){
                return res.status(404).json({
                    message: "Industry not found"
                })
            } else if(industry.get('approved')) {
                return res.status(200).json({
                    industries: [
                        {
                            id: industry.id,
                            data: industry.data()
                        }
                    ]
                })
            }
        } else {
            const requests = await firestore.collection(`plants/${plantID}/industryUsers`).where('approved', '==', true).get()
            
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
            
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

// returns all industries of a plant using admin's id
module.exports.getUnapprovedRequests = async (req,res) => {
    const plantID = req.userData.plantID

    try {
        const requests = await firestore.collection(`plants/${plantID}/industryUsers`).where('approved', '==', false).get()
        
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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

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
module.exports.approveRequest = async (req,res) => {
    const industryuid = req.params.uid
    const plantID = req.userData.plantID

    try {
        // plant check for admin and industry
        const industryRequest = await firestore.collection('industriesRequest').doc(industryuid).get()

        if(industryRequest.get('plantID') !== plantID){
            return res.status(401).json({
                message: "Admin doesn't belong to the industries' selected plant"
            })
        }

        const industry = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryuid).get()

        // create new industry firebase account
        const date = new Date()
        const newPassword = `${industry.data().companyName}_${Math.floor(Math.random() * 900) + 100}_${date.getMilliseconds()}`

        const newIndustryAccount = await firebase.auth().createUser({
            email: industryRequest.get('email'),
            password: newPassword,
            emailVerified: false,
            disabled: false
        })

        // set custom claim for plant id on industry
        await firebase.auth().setCustomUserClaims(newIndustryAccount.uid, {
            plantID: plantID,
            role: "industry",
            industryid: industryuid
        })

        // update industry approved field in plant's industry collection
        await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryuid).update({
            approved: true
        })

        // remove industry request from the industriesRequest collection
        await firestore.collection('industriesRequest').doc(industryuid).delete()

        // send email with credentials
        await Email.sendCredentialMail("Industry", newIndustryAccount.email, newPassword)

        return res.status(200).json({
            message: "Industry approved and credential mail sent"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

/**
 * On rejecting a request
 *      ~ Error checking
 *      ~ Delete industry firebase account
 *      ~ Delete industry acceptance request
 *      ~ Delete industry from plant's industry collection
 *      ~ Send rejection email
 */
module.exports.rejectRequest = async (req,res) => {
    const industryuid = req.params.uid
    const plantID = req.userData.plantID

    try {
        const industryRequest = await firestore.collection('industriesRequest').doc(industryuid).get()

        if(!industryRequest.exists){
            return res.status(404).json({
                message: "Industry request doesn't exist"
            })
        }

        if(industryRequest.get('plantID') !== plantID){
            return res.status(401).json({
                message: "Admin doesn't belong to the industries' selected plant"
            })
        }
        
        // delete industry from plant's industry collection
        await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryuid).delete()

        // remove industry request from the industriesRequest collection
        await firestore.collection('industriesRequest').doc(industryuid).delete()

        // send rejection email
        await Email.sendIndustryRejectionMail(industryRequest.get('email'))

        return res.status(200).json({
            message: "Industry Rejected and rejection mail sent"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

const header = {
    companyName: "compulsory",
    address: "compulsory",
    email: "compulsory",
    phoneNo: "compulsory",
    pincode: "optional",
    IC_chamber_install: "optional",
    cetp_stp_etp_type: "optional",
    consentValidity: "optional",
    domesticEffluent: "optional",
    h_n_type: "optional",
    phase: "optional",
    pno: "optional",
    totalEffluentTradeAndUtility: "optional",
    unitId: "optional",
    remark: "optional"
}

module.exports.bulkUpload = async (req,res) => {
    const industries = req.file
    const plantID = req.userData.plantID

    try {
        if(!industries){
            return res.status(400).json({
                message: "Please upload a file"
            })
        }

        // check if the extension of the file is .csv or not
        if(industries.originalname.split('.')[industries.originalname.split('.').length-1] !== 'csv'){
            return res.status(400).json({
                message: "Only .csv files are allowed"
            })
        }

        const workbook = new Excel.Workbook()
        await workbook.csv.readFile(industries.path);
        fs.unlink(industries.path, () => {})

        const worksheet = workbook.getWorksheet(1);

        let headerError = false;
        let headerErrorObject = {};
        const headerKeys = Object.keys(header); // Get the keys from the header object

        const firstRowValues = worksheet.getRow(1).values.slice(1); // Adjust for Excel's indexing

        if (headerKeys.length !== firstRowValues.length) {
            headerError = true;
            headerErrorObject = {
                message: 'Header length mismatch',
                expectedHeaders: headerKeys,
                obtainedHeaders: firstRowValues
            };
        } else {
            for (let i = 0; i < headerKeys.length; i++) {
                if (headerKeys[i] !== firstRowValues[i]) { 
                    headerError = true;
                    headerErrorObject = {
                        message: 'Incorrect header value',
                        headerObtained: firstRowValues[i],
                        headerRequired: headerKeys[i]
                    };
                    break; 
                }
            }
        }

        if(headerError){
            return res.status(400).json(headerErrorObject)
        }

        const errorRows = []
        const readyRows = []
        const mails = new Set()
        const promises = [];

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header row

            promises.push(new Promise(async (resolve, reject) => {
                const rowData = row.values.slice(1); // Adjust to correct Excel's leading undefined element
                let rowObject = {};
                let errors = [];

                // Process each key asynchronously
                await Promise.all(Object.keys(header).map(async (key, index) => {
                    // Use header names as keys, and assign values or null string if missing
                    rowObject[key] = rowData[index] ? rowData[index] : "";

                    if (index < 4 && (rowData[index] === undefined || rowData[index] === "")) {
                        // Check for errors in the first 4 columns
                        errors.push(`Missing required ${key} field`);
                    } else if (key === 'email') {
                        // check if email is valid by regex
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(rowObject.email)) {
                            errors.push('Invalid email');
                        }

                        const checkMail = await mailChecker(rowObject.email)
                        if (checkMail) {
                            errors.push("Email already exists, try with a different email");
                        } else if (mails.has(rowObject.email)) {
                            errors.push('Some other industry already has this email in the uploaded file');
                        } else {
                            mails.add(rowObject.email)
                        }
                    } else if (key === 'IC_chamber_install') {
                        rowObject[key] = rowObject[key].toLowerCase();
                        if (rowObject[key] !== 'true' && rowObject[key] !== 'false' && rowObject[key].length !== 0) {
                            errors.push('IC_chamber_install can only be true or false');
                        }
                    } else if (key === "cetp_stp_etp_type") {
                        rowObject[key] = rowObject[key].toLowerCase();
                        
                        if(rowObject[key].length > 15){
                            errors.push('cetp_stp_etp_type can only be of length 15');
                        }
                    } else if (key === "h_n_type") {
                        rowObject[key] = rowObject[key].toLowerCase();

                        if (rowObject[key] !== 'h' && rowObject[key] !== 'n' && rowObject[key].length !== 0) {
                            errors.push('h_n_type can only be h or n');
                        }
                    } else if (key === "phoneNo") {
                        if (String(rowObject[key]).length !== 10) {
                            errors.push('Phone number should be of length 10');
                        }
                    }
                }));

                if (errors.length > 0) {
                    rowObject["errors"] = errors;
                    errorRows.push(rowObject);
                } else {
                    readyRows.push(rowObject);
                }

                // Resolve the promise once the row processing is complete
                resolve();
            }));
        });

        // Wait for all promises to resolve
        await Promise.all(promises);
        
        if(errorRows.length>0){
            return res.status(400).json({
                message: 'Please check the error in rows and correct them.',
                readyRows: readyRows,
                errorRows: errorRows
            })
        } else {
            for (let i = 0; i < readyRows.length; i++) {
                const industryElement = readyRows[i];
                
                // create firebase account of industry
                const date = new Date()
                const newPassword = `${industryElement.companyName.replace(/\s+/g, '').toLowerCase().substring(0,3)}_${Math.floor(Math.random() * 900) + 100}_${date.getMilliseconds()}`
                const industryAuth = await firebase.auth().createUser({
                    email: industryElement.email,
                    emailVerified: false,
                    password: newPassword,
                    disabled: false,
                })
 
                // modifications for the industry object
                industryElement["apiID"]=null
                industryElement["isActive"]=1
                industryElement["fcm_token"]=""
                industryElement["approved"]=true
                industryElement["plantID"]=plantID
                industryElement["dateAdded"]=industryAuth.metadata.creationTime
                industryElement["IC_chamber_install"]=industryElement.IC_chamber_install === 'true' ? true : false
                
                // add industry to plant's industry collection
                const industry = await firestore.collection(`plants/${plantID}/industryUsers`).add(industryElement)
                
                // set custom claim for plant id on industry
                await firebase.auth().setCustomUserClaims(industryAuth.uid, {
                    plantID: plantID,
                    role: "industry",
                    industryid: industry.id
                })

                // send email of credentials
                await Email.sendCredentialMail("Industry", industryAuth.email, newPassword)
            }
            
            return res.status(200).json({
                message: 'Industries added successfully'
            })
        }

    } catch (error) {
        fs.unlink(industries.path, () => {})
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

// Normal function to delete an industry based on the admin's uid (to get the plant collection)
module.exports.deleteIndustry = async (req,res) => {
    const industryid = req.params.uid
    const plantID = req.userData.plantID

    try {
        const industryFirestore = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()
        const industry = await firebase.auth().getUserByEmail(industryFirestore.get('email'))

        // delete industries firebase account
        await firebase.auth().deleteUser(industry.uid)

        // delete industry from plant's industry collection
        await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).delete()

        // delete request from industry requests (if present)
        await IndustryRequest.doc(industryid).delete()

        return res.status(200).json({
            message: "Industry deleted"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

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

        const industryFirestore = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()
        const industry = await firebase.auth().getUserByEmail(industryFirestore.get('email'))

        // delete industries firebase account
        await firebase.auth().deleteUser(industry.uid)

        // delete industry from plant's industry collection
        await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).delete()

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