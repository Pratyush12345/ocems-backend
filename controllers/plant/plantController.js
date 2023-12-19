const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const Razorpay = require('razorpay')
const axios = require('axios')
const db = firebase.database()

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})

module.exports.createPlant = (req,res) => {
    const cin = req.body.cin
    const city = req.body.city
    const email = req.body.email
    const gstin = req.body.gstin
    const isActive = req.body.isActive
    const pan = req.body.pan
    const phoneNo = req.body.phoneNo
    const pincode = req.body.pincode
    const plantAddress = req.body.plantAddress
    const plantCapacityinMLD = req.body.plantCapacityinMLD
    const plantName = req.body.plantName
    const state = req.body.state
    const telNo = req.body.telNo
    const contactName = req.body.contactName
    // const superadminuid = req.userData.uid
    const superadminuid = "dyxmg4YOT0eeDx2NtyoU0vTAWUD2"

    // create a check for all fields to be present
    if(!cin || !city || !email || !gstin || !isActive || !pan || !phoneNo || !pincode || !plantAddress || !plantCapacityinMLD || !plantName || !state || !telNo) {
        return res.status(400).json({
            message: 'All fields are required'
        })
    }

    // create a check for isActive to be boolean, plantCapacityinMLD to be number and all others to be string
    if(typeof isActive !== 'boolean') {
        return res.status(400).json({
            message: 'isActive must be a boolean'
        })
    }

    if(typeof plantCapacityinMLD !== 'number') {
        return res.status(400).json({
            message: 'plantCapacityinMLD must be a number'
        })
    }

    if(typeof cin !== 'string' || typeof city !== 'string' || typeof email !== 'string' || typeof gstin !== 'string' || typeof pan !== 'string' || typeof phoneNo !== 'string' || typeof pincode !== 'string' || typeof plantAddress !== 'string' || typeof plantName !== 'string' || typeof state !== 'string' || typeof telNo !== 'string') {
        return res.status(400).json({
            message: 'Fields except isActive and plantCapacityinMLD must be a string'
        })
    }

    // create a check for cin to be 21 characters long
    if(cin.length !== 21) {
        return res.status(400).json({
            message: 'CIN must be 21 characters long'
        })
    }

    // create a check for non empty strings
    if(!cin.trim() || !city.trim() || !email.trim() || !gstin.trim() || !pan.trim() || !phoneNo.trim() || !pincode.trim() || !plantAddress.trim() || !plantName.trim() || !state.trim() || !telNo.trim()) {
        return res.status(400).json({
            message: 'Fields cannot be empty'
        })
    }

    // create a check for gstin to be 15 characters long
    if(gstin.length !== 15) {
        return res.status(400).json({
            message: 'GSTIN must be 15 characters long'
        })
    }

    // create a check for pan to be 10 characters long
    if(pan.length !== 10) {
        return res.status(400).json({
            message: 'PAN must be 10 characters long'
        })
    }

    // create a check for phoneNo to be 10 characters long
    if(phoneNo.length !== 10) {
        return res.status(400).json({
            message: 'Phone number must be 10 characters long'
        })
    }

    // create a check for telNo to be 10 characters long
    if(telNo.length !== 10) {
        return res.status(400).json({
            message: 'Telephone number must be 10 characters long'
        })
    }

    // create a check for pincode to be 6 characters long
    if(pincode.length !== 6) {
        return res.status(400).json({
            message: 'Pincode must be 6 characters long'
        })
    }

    // create a check for email to be a valid email using regex, make it foolproof
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(email)) {
        return res.status(400).json({
            message: 'Email is not valid'
        })
    }

    firestore.collection('users').doc(superadminuid).get()
    .then(async superadmin => {
        if(!superadmin.exists) {
            return res.status(400).json({
                message: 'Superadmin does not exist'
            })
        }

        if(superadmin.data().accessLevel !== 0) {
            return res.status(400).json({
                message: 'Only Superadmin can create a plant'
            })
        }

        const year = (new Date().getFullYear()).toString()
        const nextYear = (parseInt(year) + 1).toString().slice(2,4)
        const quotationNumberYear = `${year}-${nextYear}`
        const quotationNumber = `PI/0/${quotationNumberYear}`

        const plantsCount = await firestore.collection('plants').count().get()
        const plantID = `P${plantsCount.data().count}`

        const newPlant = await firestore.collection('plants').doc(plantID).set({
            bankAccountNo: "",
            bankBranchAddress: "",
            bankIFSCCode: "",
            bankName: "",
            cin: cin,
            city: city,
            email: email,
            gstin: gstin,
            isActive: isActive,
            pan: pan,
            phoneNo: phoneNo,
            pincode: pincode,
            plantAddress: plantAddress,
            plantCapacityinMLD: plantCapacityinMLD,
            plantName: plantName,
            state: state,
            telNo: telNo,
            currentQuotationNumber: quotationNumber,
            startQuotationNumber: quotationNumber,
            razorpayAccountDetails: {
                id: "",
                status: "",
                reference_id: "",
            }
        })

        return res.status(200).json({
            message: "Plant created successfully"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.createLinkedAccount = (req,res) => {
    const email = req.body.email
    const phone = req.body.phone
    const legal_business_name = req.body.legal_business_name
    const contact_name = req.body.contact_name
    const category = req.body.category
    const subcategory = req.body.subcategory
    const street1 = req.body.street1
    const street2 = req.body.street2
    const city = req.body.city
    const state = req.body.state
    const postal_code = req.body.postal_code
    const country = req.body.country
    const pan = req.body.pan
    const gst = req.body.gst
    const notes = req.body.notes
    const plantID = req.body.plantID
    // const superadminuid = req.userData.uid
    const superadminuid = "dyxmg4YOT0eeDx2NtyoU0vTAWUD2"

    // create a check for all fields to be present
    if(!email || !phone || !legal_business_name || !contact_name || !category || !subcategory || !street1 || !street2 || !city || !state || !postal_code || !country || !pan || !gst || !notes) {
        return res.status(400).json({
            message: 'All fields are required'
        })
    }

    // create a check for all fields to be string
    if(typeof email !== 'string' || typeof phone !== 'string' || typeof legal_business_name !== 'string' || typeof contact_name !== 'string' || typeof category !== 'string' || typeof subcategory !== 'string' || typeof street1 !== 'string' || typeof street2 !== 'string' || typeof city !== 'string' || typeof state !== 'string' || typeof postal_code !== 'string' || typeof country !== 'string' || typeof pan !== 'string' || typeof gst !== 'string' || typeof notes !== 'string') {      
        return res.status(400).json({
            message: 'All fields must be a string'
        })
    }

    // create a check for non empty strings
    if(!email.trim() || !phone.trim() || !legal_business_name.trim() || !contact_name.trim() || !category.trim() || !subcategory.trim() || !street1.trim() || !street2.trim() || !city.trim() || !state.trim() || !postal_code.trim() || !country.trim() || !pan.trim() || !gst.trim() || !notes.trim()) {
        return res.status(400).json({
            message: 'Fields cannot be empty'
        })
    }

    // create a check for gst to be 15 characters long
    if(gst.length !== 15) {
        return res.status(400).json({
            message: 'GST must be 15 characters long'
        })
    }

    // create a check for pan to be 10 characters long
    if(pan.length !== 10) {
        return res.status(400).json({
            message: 'PAN must be 10 characters long'
        })
    }

    // create a check for phone to be 10 characters long
    if(phone.length !== 10) {
        return res.status(400).json({
            message: 'Phone number must be 10 characters long'
        })
    }

    // create a check for email to be a valid email using regex, make it foolproof
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(email)) {
        return res.status(400).json({
            message: 'Email is not valid'
        })
    }

    // create a check for postal_code to be 6 characters long
    if(postal_code.length !== 6) {
        return res.status(400).json({
            message: 'Postal code must be 6 characters long'
        })
    }

    // create a check for country code to be IN
    if(country !== 'IN') {
        return res.status(400).json({
            message: 'Country code must be IN'
        })
    }

    firestore.collection('users').doc(superadminuid).get()
    .then(async superadmin => {
        if(!superadmin.exists) {
            return res.status(400).json({
                message: 'Superadmin does not exist'
            })
        }

        if(superadmin.data().accessLevel !== 0) {
            return res.status(400).json({
                message: 'Only Superadmin can create a linked account'
            })
        }

        const plant = await firestore.collection('plants').doc(plantID).get()

        if(!plant.exists) {
            return res.status(400).json({
                message: 'Plant does not exist'
            })
        }

        const razorpayLACid = plant.data().razorpayAccountDetails.id

        if(razorpayLACid !== undefined) {
            return res.status(400).json({
                message: 'Plant already has a linked account'
            })
        }

        const { customAlphabet } = await import('nanoid');
        const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        const nanoid = customAlphabet(alphabet, 11);
        const nano = nanoid()

        // create an api request using axios to create a razorpay linked account
        const razorpayLAC = await axios({
            method: 'POST',
            url: 'https://api.razorpay.com/v2/accounts',
            auth: {
                username: process.env.RAZORPAY_KEY_ID,
                password: process.env.RAZORPAY_KEY_SECRET
            },
            data: {
                email: email,
                phone: phone,
                type: "route",
                reference_id: nano,
                legal_business_name: legal_business_name,
                business_type: "other",
                contact_name: contact_name,
                profile: {
                    category: "government",
                    subcategory: "state",
                    addresses: {
                        registered: {
                            street1: street1,
                            street2: street2,
                            city: city,
                            state: state,
                            postal_code: postal_code,
                            country: country
                        }
                    }
                },
                legal_info: {
                    pan: pan,
                    gst: gst
                },
                notes: {
                    plantID: plantID,
                }
            }
        })

        await firestore.collection('plants').doc(plantID).update({
            razorpayAccountDetails: {
                id: razorpayLAC.data.id,
                status: razorpayLAC.data.activation_status,
                reference_id: razorpayLAC.data.reference_id,
            }
        })

        return res.status(200).json({
            message: "Linked account created successfully"
        })
    })
    .catch(err => {
        if(err.response.data.error.code === 'BAD_REQUEST_ERROR') {
            return res.status(400).json({
                message: err.response.data
            })
        }
        else {
            console.log(err);
            return res.status(500).json({
                error: err
            })
        }
    })
}

module.exports.createStakeholder = (req,res) => {
    const stakeholder = req.body.stakeholder
    const plantID = req.body.plantID
    // const superadminuid = req.userData.uid
    const superadminuid = "dyxmg4YOT0eeDx2NtyoU0vTAWUD2"

    if(!stakeholder) {
        return res.status(400).json({
            message: 'Stakeholder is required'
        })
    }

    if(typeof stakeholder !== 'object') {
        return res.status(400).json({
            message: 'Stakeholder must be an object'
        })
    }

    if(!stakeholder.name || !stakeholder.email || !stakeholder.addresses || !stakeholder.kyc || !stakeholder.notes) {
        return res.status(400).json({
            message: 'Stakeholder must have name, email, addresses, kyc and notes'
        })
    }

    if(typeof stakeholder.name !== 'string' || typeof stakeholder.email !== 'string' || typeof stakeholder.addresses !== 'object' || typeof stakeholder.addresses.residential !== 'object' || typeof stakeholder.kyc !== 'object' || typeof stakeholder.notes !== 'object') {
        return res.status(400).json({
            message: 'Stakeholder must have name, email, addresses, kyc and notes'
        })
    }

    if(!stakeholder.addresses.residential) {
        return res.status(400).json({
            message: 'Stakeholder must have residential address'
        })
    }

    if(!stakeholder.addresses.residential.street || !stakeholder.addresses.residential.city || !stakeholder.addresses.residential.state || !stakeholder.addresses.residential.postal_code || !stakeholder.addresses.residential.country) {
        return res.status(400).json({
            message: 'Stakeholder residential address must have street, city, state, postal_code and country'
        })
    }

    if(typeof stakeholder.addresses.residential.street !== 'string' || typeof stakeholder.addresses.residential.city !== 'string' || typeof stakeholder.addresses.residential.state !== 'string' || typeof stakeholder.addresses.residential.postal_code !== 'string' || typeof stakeholder.addresses.residential.country !== 'string') {
        return res.status(400).json({
            message: 'All Stakeholder residential address fields should be strings'
        })
    }

    // create a check for non empty strings
    if(!stakeholder.addresses.residential.street.trim() || !stakeholder.addresses.residential.city.trim() || !stakeholder.addresses.residential.state.trim() || !stakeholder.addresses.residential.postal_code.trim() || !stakeholder.addresses.residential.country.trim()) {
        return res.status(400).json({
            message: 'Stakeholder residential address fields cannot be empty'
        })
    }

    // create a check for postal_code to be 6 characters long
    if(stakeholder.addresses.residential.postal_code.length !== 6) {
        return res.status(400).json({
            message: 'Stakeholder residential address postal_code must be 6 characters long'
        })
    }

    // create a check for country code to be IN
    if(stakeholder.addresses.residential.country !== 'IN') {
        return res.status(400).json({
            message: 'Stakeholder residential address country must be IN'
        })
    }

    if(!stakeholder.kyc.pan) {
        return res.status(400).json({
            message: 'Stakeholder must have pan'
        })
    }

    if(typeof stakeholder.kyc.pan !== 'string') {
        return res.status(400).json({
            message: 'Stakeholder pan must be a string'
        })
    }
    
    // create a check for pan to be 10 characters long
    if(stakeholder.kyc.pan.length !== 10) {
        return res.status(400).json({
            message: 'Stakeholder pan must be 10 characters long'
        })
    }

    firestore.collection('plants').doc(plantID).get()
    .then(async plant => {
        if(!plant.exists) {
            return res.status(400).json({
                message: 'Plant does not exist'
            })
        }

        const razorpayLACid = plant.data().razorpayAccountDetails.id

        if(razorpayLACid === undefined) {
            return res.status(400).json({
                message: 'Please create a razorpay linked account first'
            })
        }

        const LAC = await axios({
            method: 'POST',
            url: `https://api.razorpay.com/v2/accounts/${razorpayLACid}`,
            auth: {
                username: process.env.RAZORPAY_KEY_ID,
                password: process.env.RAZORPAY_KEY_SECRET
            }
        })

        if(LAC.notes.plantID !== plantID) {
            return res.status(400).json({
                message: 'PlantID does not match with the Linked Account'
            })
        }

        const stakeholderAC = await axios({
            method: 'POST',
            url: `https://api.razorpay.com/v2/accounts/${razorpayLACid}/stakeholders`,
            auth: {
                username: process.env.RAZORPAY_KEY_ID,
                password: process.env.RAZORPAY_KEY_SECRET
            },
            data: {
                name: stakeholder.name,
                email: stakeholder.email,
                addresses: stakeholder.addresses,
                kyc: stakeholder.kyc,
                notes: stakeholder.notes
            }
        })

        await firestore.collection('plants').doc(plantID).update({
            stakeholder: {
                rzpid: stakeholderAC.data.id, // razorpay stakeholder id
                name: stakeholder.name, 
                email: stakeholder.email,
                addresses: stakeholder.addresses,
                kyc: stakeholder.kyc,
                notes: stakeholder.notes
            }
        })

        return res.status(200).json({
            message: "Stakeholder created successfully"
        })
    })
    .catch(err => {
        if(err.response.data.error.code === 'BAD_REQUEST_ERROR') {
            return res.status(400).json({
                message: err.response.data
            })
        }
        else {
            console.log(err);
            return res.status(500).json({
                error: err
            })
        }
    })
}

module.exports.acceptTnc = (req,res) => {
    const tncaccepted = req.body.tncaccepted
    const plantID = req.body.plantID
    // const superadminuid = req.userData.uid
    const superadminuid = "dyxmg4YOT0eeDx2NtyoU0vTAWUD2"

    // create a check for tncaccepted to be boolean
    if(typeof tncaccepted !== 'boolean') {
        return res.status(400).json({
            message: 'tncaccepted must be a boolean'
        })
    }
    
    firestore.collection('users').doc(superadminuid).get()
    .then(async superadmin => {

        if(!superadmin.exists) {
            return res.status(400).json({
                message: 'Superadmin does not exist'
            })
        }

        if(superadmin.data().accessLevel !== 0) {
            return res.status(400).json({
                message: 'Only Superadmin can accept TNC'
            })
        }

        const plant = await firestore.collection('plants').doc(plantID).get()

        if(!plant.exists) {
            return res.status(400).json({
                message: 'Plant does not exist'
            })
        }

        const razorpayLACid = plant.data().razorpayAccountDetails.id

        if(razorpayLACid === undefined) {
            return res.status(400).json({
                message: 'Please create a razorpay linked account first'
            })
        }

        const LAC = await axios({
            method: 'POST',
            url: `https://api.razorpay.com/v2/accounts/${razorpayLACid}`,
            auth: {
                username: process.env.RAZORPAY_KEY_ID,
                password: process.env.RAZORPAY_KEY_SECRET
            }
        })

        if(LAC.notes.plantID !== plantID) {
            return res.status(400).json({
                message: 'PlantID does not match with the Linked Account'
            })
        }

        const TNC = await axios({
            method: 'POST',
            url: `https://api.razorpay.com/v2/accounts/${razorpayLACid}/products`,
            auth: {
                username: process.env.RAZORPAY_KEY_ID,
                password: process.env.RAZORPAY_KEY_SECRET
            },
            data: {
                product_name: "route",
                tnc_accepted: true
            }
        })    
        
        await firestore.collection('plants').doc(plantID).update({
            razorpayAccountDetails: {
                status: TNC.data.activation_status,
            }
        })

        if(TNC.data.tnc.accepted && TNC.data.requirements.length !== 0) {
            return res.status(400).json({
                message: 'TNC Accepeted, Please provide the bank account details',
            })
        } else if(TNC.data.tnc.accepted){
            return res.status(400).json({
                message: 'TNC accepted'
            })
        } else if(!TNC.data.tnc.accepted){
            return res.status(400).json({
                message: 'TNC not accepted'
            })
        }
    })
    .catch(err => {
        if(err.response.data.error.code === 'BAD_REQUEST_ERROR') {
            return res.status(400).json({
                message: err.response.data.error.description,
                data: err.response.data
            })
        }
        else {
            console.log(err);
            return res.status(500).json({
                error: err
            })
        }
    })
}

module.exports.addBankDetails = (req,res) => {
    const bankAccountNo = req.body.bankAccountNo
    const bankBranchAddress = req.body.bankBranchAddress
    const bankIFSCCode = req.body.bankIFSCCode
    const bankName = req.body.bankName
    const beneficiaryName = req.body.beneficiaryName
    const tncaccepted = req.body.tncaccepted
    const plantID = req.body.plantID
    // const superadminuid = req.userData.uid
    const superadminuid = "dyxmg4YOT0eeDx2NtyoU0vTAWUD2"

    // create a check for all fields to be present
    if(!bankAccountNo || !bankBranchAddress || !bankIFSCCode || !bankName || !beneficiaryName || !tncaccepted || !plantID) {
        return res.status(400).json({
            message: 'All fields are required'
        })
    }

    // create a check for tncaccepted to be boolean
    if(typeof tncaccepted !== 'boolean') {
        return res.status(400).json({
            message: 'tncaccepted must be a boolean'
        })
    }

    // create a check for all fields to be string
    if(typeof bankAccountNo !== 'string' || typeof bankBranchAddress !== 'string' || typeof bankIFSCCode !== 'string' || typeof bankName !== 'string' || typeof beneficiaryName !== 'string') {
        return res.status(400).json({
            message: 'All fields must be a string'
        })
    }

    // create a check for non empty strings
    if(!bankAccountNo.trim() || !bankBranchAddress.trim() || !bankIFSCCode.trim() || !bankName.trim() || !beneficiaryName.trim()) {
        return res.status(400).json({
            message: 'Fields cannot be empty'
        })
    }

    // create a check for ifsc code to be 11 characters long
    if(bankIFSCCode.length !== 11) {
        return res.status(400).json({
            message: 'IFSC code must be 11 characters long'
        })
    }
    
    firestore.collection('users').doc(superadminuid).get()
    .then(async superadmin => {

        if(!superadmin.exists) {
            return res.status(400).json({
                message: 'Superadmin does not exist'
            })
        }

        if(superadmin.data().accessLevel !== 0) {
            return res.status(400).json({
                message: 'Only Superadmin can add bank details'
            })
        }

        const plant = await firestore.collection('plants').doc(plantID).get()

        if(!plant.exists) {
            return res.status(400).json({
                message: 'Plant does not exist'
            })
        }

        const razorpayLACid = plant.data().razorpayAccountDetails.id
        const stakeholderACid = plant.data().stakeholder.rzpid

        if(razorpayLACid === undefined) {
            return res.status(400).json({
                message: 'Please create a razorpay linked account first'
            })
        }

        if(stakeholderACid === undefined) {
            return res.status(400).json({
                message: 'Please create a stakeholder first'
            })
        }

        const LAC = await axios({
            method: 'POST',
            url: `https://api.razorpay.com/v2/accounts/${razorpayLACid}`,
            auth: {
                username: process.env.RAZORPAY_KEY_ID,
                password: process.env.RAZORPAY_KEY_SECRET
            }
        })

        if(LAC.notes.plantID !== plantID) {
            return res.status(400).json({
                message: 'PlantID does not match with the Linked Account'
            })
        }

        const rzpBankDetails = await axios({
            method: 'POST',
            url: `https://api.razorpay.com/v2/accounts/${razorpayLACid}/products`,
            auth: {
                username: process.env.RAZORPAY_KEY_ID,
                password: process.env.RAZORPAY_KEY_SECRET
            },
            data: {
                settlements:{
                    account_number: bankAccountNo,
                    ifsc_code: bankIFSCCode,
                    beneficiary_name: beneficiaryName,
                },
                tnc_accepted: tncaccepted
            }
        })    
        
        await firestore.collection('plants').doc(plantID).update({
            bankAccountNo: bankAccountNo,
            bankBranchAddress: bankBranchAddress,
            bankIFSCCode: bankIFSCCode,
            bankName: bankName,
            beneficiaryName: beneficiaryName,
            razorpayAccountDetails: {
                status: rzpBankDetails.data.activation_status,
            }
        })

        if(rzpBankDetails.data.requirements.length !== 0){
            return res.status(400).json({
                message: "Bank details added successfully, Please fullfill the requirements",
                requirements: rzpBankDetails.data.requirements
            })
        } else {
            return res.status(200).json({
                message: "Bank details added successfully"
            })
        }
    })
    .catch(err => {
        if(err.response.data.error.code === 'BAD_REQUEST_ERROR') {
            return res.status(400).json({
                message: err.response.data.error.description,
                data: err.response.data
            })
        }
        else {
            console.log(err);
            return res.status(500).json({
                error: err
            })
        }
    })
}

module.exports.getDepartmentAccess = (req,res) => {
    const adminid = req.userData.uid

    firestore.collection('users').doc(adminid).get()
    .then(async admin => {
        if(!admin.exists) {
            return res.status(400).json({
                message: 'Admin does not exist'
            })
        }

        if(admin.data().accessLevel !== 1) {
            return res.status(400).json({
                message: 'Only Admin can perform this operation'
            })
        }
        const plantID = admin.get('plantID')

        const plant = await firestore.collection('plants').doc(plantID).get()

        if(!plant.exists) {
            return res.status(400).json({
                message: 'Plant does not exist'
            })
        }

        const ref = db.ref(`DepartmentAccess/${plantID}`)
        const snapshot = await ref.once('value')
        const departmentAccess = snapshot.val()

        return res.status(200).json({
            departmentAccess: departmentAccess
        })
    })
}

module.exports.updateDepartmentAccess = (req,res) => {
    const departmentAccess = req.body.departmentAccess
    const adminid = req.userData.uid

    // check if departmentAccess is an array
    if(!Array.isArray(departmentAccess)){
        return res.status(400).json({
            message: "Department Access should be an array"
        })
    }

    // check if departmentAccess is an array of strings
    if(!departmentAccess.every((value) => typeof value === 'string')){
        return res.status(400).json({
            message: "Department Access should be an array of strings"
        })
    }

    firestore.collection('users').doc(adminid).get()
    .then(async admin => {
        if(!admin.exists) {
            return res.status(400).json({
                message: 'Admin does not exist'
            })
        }

        if(admin.data().accessLevel !== 1) {
            return res.status(400).json({
                message: 'Only Admin can perform this operation'
            })
        }
        const plantID = admin.get('plantID')

        const plant = await firestore.collection('plants').doc(plantID).get()

        if(!plant.exists) {
            return res.status(400).json({
                message: 'Plant does not exist'
            })
        }

        const ref = db.ref(`DepartmentAccess/${plantID}`)
        const snapshot = await ref.once('value')
        const departmentAccessOld = snapshot.val()

        // in the departmentAccessOld array add the new departments from departmentAccess array (make sure none of the departments are repeated)
        departmentAccess.forEach(department => {
            if(!departmentAccessOld.includes(department)) {
                departmentAccessOld.push(department)
            }
        })

        // replace the previous departmentAccess array with the new departmentAccessOld array in the database
        await ref.set(departmentAccessOld)

        return res.status(200).json({
            message: 'Department access updated successfully'
        })
    })
}

module.exports.deleteDepartmentAccess = (req,res) => {
    const departmentAccess = req.body.departmentAccess
    const adminid = req.userData.uid

    // check if departmentAccess is an array
    if(!Array.isArray(departmentAccess)){
        return res.status(400).json({
            message: "Department Access should be an array"
        })
    }

    // check if departmentAccess is an array of strings
    if(!departmentAccess.every((value) => typeof value === 'string')){
        return res.status(400).json({
            message: "Department Access should be an array of strings"
        })
    }

    firestore.collection('users').doc(adminid).get()
    .then(async admin => {
        if(!admin.exists) {
            return res.status(400).json({
                message: 'Admin does not exist'
            })
        }

        if(admin.data().accessLevel !== 1) {
            return res.status(400).json({
                message: 'Only Admin can perform this operation'
            })
        }
        const plantID = admin.get('plantID')

        const plant = await firestore.collection('plants').doc(plantID).get()

        if(!plant.exists) {
            return res.status(400).json({
                message: 'Plant does not exist'
            })
        }

        const ref = db.ref(`DepartmentAccess/${plantID}`)
        const snapshot = await ref.once('value')
        const departmentAccessOld = snapshot.val()

        // in the departmentAccessOld array remove the departments from departmentAccess array (make sure none of the departments are repeated)
        departmentAccess.forEach(department => {
            if(departmentAccessOld.includes(department)) {
                departmentAccessOld.splice(departmentAccessOld.indexOf(department), 1)
            }
        })

        // replace the previous departmentAccess array with the new departmentAccessOld array in the database
        await ref.set(departmentAccessOld)

        return res.status(200).json({
            message: 'Department access updated successfully'
        })
    })
}