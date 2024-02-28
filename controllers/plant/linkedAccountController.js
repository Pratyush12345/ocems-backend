const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const Razorpay = require('razorpay')
const axios = require('axios')

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})

const linkedAcReqFields = [
    'email',
    'phone',
    'legal_business_name',
    'contact_name',
    'street1',
    'street2',
    'city',
    'state',
    'postal_code',
    'country',
    'plantID'
]

const bankDetailsReqFields = [
    'bankAccountNo',
    'bankBranchAddress',
    'bankIFSCCode',
    'bankName',
    'beneficiaryName',
    'tncaccepted',
    'plantID'
]

const bankBooleanReqFields = [
    'tncaccepted'
]

module.exports.createLinkedAccount = async (req,res) => {
    const email = req.body.email
    const phone = req.body.phone
    const legal_business_name = req.body.legal_business_name
    const contact_name = req.body.contact_name
    // const category = req.body.category
    // const subcategory = req.body.subcategory
    const street1 = req.body.street1
    const street2 = req.body.street2
    const city = req.body.city
    const state = req.body.state
    const postal_code = req.body.postal_code
    const country = req.body.country
    const pan = req.body.pan
    const gst = req.body.gst
    // const notes = req.body.notes
    const plantID = req.userData.plantID

    for (let i = 0; i < linkedAcReqFields.length; i++) {
        const element = linkedAcReqFields[i];

        // create a check for all fields to be present
        if(!req.body[element]) {
            return res.status(400).json({
                message: `${element} is required`
            })
        }
    }

    let validationError = false
    Object.keys(req.body).forEach(key => {
        if(!linkedAcReqFields.includes(key)) {
            validationError = true
            res.status(400).json({
                message: `${key} is not a valid field`
            })
            return
        }

        if(linkedAcReqFields.includes(key)) {
            if(typeof req.body[key] !== 'string') {
                validationError = true
                res.status(400).json({
                    message: `${key} must be a string`
                })
                return
            }

            if(!req.body[key].trim()) {
                validationError = true
                res.status(400).json({
                    message: `${key} cannot be empty`
                })
                return
            }
        }

    })

    if(validationError) {
        return
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

    try {
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
                    pan: plant.get('pan'),
                    gst: plant.get('gstin')
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
    } catch (error) {
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
    }

}

module.exports.createStakeholder = async (req,res) => {
    const stakeholder = req.body.stakeholder
    const plantID = req.userData.plantID

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

    try {
        const plant = await firestore.collection('plants').doc(plantID).get()

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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.acceptTnc = async (req,res) => {
    const tncaccepted = req.body.tncaccepted
    const plantID = req.userData.plantID

    // create a check for tncaccepted to be boolean
    if(typeof tncaccepted !== 'boolean') {
        return res.status(400).json({
            message: 'tncaccepted must be a boolean'
        })
    }

    try {
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
    } catch (error) {
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
    }
    
}

module.exports.addBankDetails = async (req,res) => {
    const bankAccountNo = req.body.bankAccountNo
    const bankBranchAddress = req.body.bankBranchAddress
    const bankIFSCCode = req.body.bankIFSCCode
    const bankName = req.body.bankName
    const beneficiaryName = req.body.beneficiaryName
    const tncaccepted = req.body.tncaccepted
    const plantID = req.userData.plantID

    for (let i = 0; i < bankDetailsReqFields.length; i++) {
        const element = bankDetailsReqFields[i];

        // create a check for all fields to be present
        if(!req.body[element]) {
            return res.status(400).json({
                message: `${element} is required`
            })
        }
    }

    let validationError = false
    Object.keys(req.body).forEach(key => {
        if(!bankDetailsReqFields.includes(key)) {
            validationError = true
            res.status(400).json({
                message: `${key} is not a valid field`
            })
            return
        }

        if(bankDetailsReqFields.includes(key)) {
            if(typeof req.body[key] !== 'string') {
                validationError = true
                res.status(400).json({
                    message: `${key} must be a string`
                })
                return
            }

            if(!req.body[key].trim()) {
                validationError = true
                res.status(400).json({
                    message: `${key} cannot be empty`
                })
                return
            }
        }

        if(bankBooleanReqFields.includes(key)) {
            if(typeof req.body[key] !== 'boolean') {
                validationError = true
                res.status(400).json({
                    message: `${key} must be a boolean`
                })
                return
            }
        }

    })

    if(validationError) {
        return
    }

    // create a check for ifsc code to be 11 characters long
    if(bankIFSCCode.length !== 11) {
        return res.status(400).json({
            message: 'IFSC code must be 11 characters long'
        })
    }

    try {
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
    } catch (error) {
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
    }
 
}
