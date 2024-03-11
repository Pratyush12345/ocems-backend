const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const db = firebase.database()

const plantRequiredFields = [
    'cin',
    'city',
    'email',
    'gstin',
    'isActive',
    'pan',
    'phoneNo',
    'pincode',
    'plantAddress',
    'plantCapacityinMLD',
    'plantName',
    'state',
    'telNo',
]

const stringFields = [
    'cin',
    'city',
    'email',
    'gstin',
    'pan',
    'phoneNo',
    'pincode',
    'plantAddress',
    'plantName',
    'state',
    'telNo'
]

const numberFields = [
    'plantCapacityinMLD'
]

const booleanFields = [
    'isActive'
]

module.exports.getPlant = (req,res) => {
    const plantid = req.query.plantid

    if(!plantid) {
        return res.status(400).json({
            message: 'Plant ID is required'
        })
    }

    firestore.collection('plants').doc(plantid).get()
    .then(plant => {
        if(!plant.exists) {
            return res.status(400).json({
                message: 'Plant does not exist'
            })
        }

        return res.status(200).json({
            plant: plant.data()
        })
    })
}

module.exports.createPlant = async (req,res) => {
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

    for (let i = 0; i < plantRequiredFields.length; i++) {
        const element = plantRequiredFields[i];

        // create a check for all fields to be present
        if(!req.body[element]) {
            return res.status(400).json({
                message: `${element} is required`
            })
        }
    }

    let validationError = false
    Object.keys(req.body).forEach(key => {
        if(!plantRequiredFields.includes(key)) {
            validationError = true
            res.status(400).json({
                message: `${key} is not a valid field`
            })
            return
        }

        if(stringFields.includes(key)) {
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

        if(numberFields.includes(key)) {
            if(typeof req.body[key] !== 'number') {
                validationError = true
                res.status(400).json({
                    message: `${key} must be a number`
                })
                return
            }
        }

        if(booleanFields.includes(key)) {
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

    // create a check for cin to be 21 characters long
    if(cin.length !== 21) {
        return res.status(400).json({
            message: 'CIN must be 21 characters long'
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

    try {
        const year = (new Date().getFullYear()).toString()
        const nextYear = (parseInt(year) + 1).toString().slice(2,4)
        const quotationNumberYear = `${year}-${nextYear}`
        const quotationNumber = `PI/0/${quotationNumberYear}`

        const plantsCount = await firestore.collection('plants').count().get()
        const plantID = `P${plantsCount.data().count}`

        await firestore.collection('plants').doc(plantID).set({
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
            currentQuotationNo: quotationNumber,
            startQuotationNo: quotationNumber,
            razorpayAccountDetails: {
                id: "",
                status: "",
                reference_id: "",
            }
        })

        return res.status(200).json({
            message: "Plant created successfully"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.getDepartmentAccess = async (req,res) => {
    const plantID = req.userData.plantID

    try {
        const ref = db.ref(`DepartmentAccess/${plantID}`)
        const snapshot = await ref.once('value')
        const departmentAccess = snapshot.val()

        return res.status(200).json({
            departmentAccess: departmentAccess
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.updateDepartmentAccess = async (req,res) => {
    const departmentAccess = req.body.departmentAccess
    const plantID = req.userData.plantID

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

    try {
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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.deleteDepartmentAccess = async (req,res) => {
    const departmentAccess = req.body.departmentAccess
    const plantID = req.userData.plantID

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

    try {
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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}