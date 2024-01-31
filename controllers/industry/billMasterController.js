const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const db = firebase.database()

module.exports.getMasterCopiesTypes = (req,res) => {
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
                message: "Only admin can perform billing operations"
            })
        }

        const plantID = admin.get('plantID')

        const masterBillTypes = (await db.ref(`BillTypes`).once('value')).val()

        return res.status(200).json({
            types: masterBillTypes
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.getMasterCopies = (req,res) => {
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
                message: "Only admin can perform billing operations"
            })
        }

        const plantID = admin.get('plantID')
        const billMasterid = req.query.id
        let query 

        if(billMasterid!==undefined){
            query = await firestore.collection(`plants/${plantID}/billMasterCopy`).doc(billMasterid).get()

            if(!query.exists){
                return res.status(404).json({
                    message: "Bill Master copy not found"
                })
            }

            return res.status(200).json({
                billMasterCopies: [
                    {
                        id: billMasterid,
                        data: query.data()
                    }
                ]
            })
        } 
        
        query = await firestore.collection(`plants/${plantID}/billMasterCopy`).get()

        const billMasters = [];
        query.forEach((doc) => {
            billMasters.push({
                id: doc.id,
                data: doc.data(),
            });
        });
        
        return res.status(200).json({
            billMasterCopies: billMasters
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.createCopy = (req,res) => {
    const HSN_SAC_code = req.body.HSN_SAC_code
    const cgstRate = req.body.cgstRate
    const sgstRate = req.body.sgstRate
    const declaration = req.body.declaration
    const description = req.body.description
    const price = req.body.price
    const requiredFields = req.body.requiredFields
    const termsAndCondn = req.body.termsAndCondn
    const type = req.body.type
    const unit = req.body.unit
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
                message: "Only admin can perform billing operations"
            })
        }

        const plantID = admin.get('plantID')

        // create a bill master copy
        const date = new Date()
        await firestore.collection(`plants/${plantID}/billMasterCopy`).add({
            HSN_SAC_code: HSN_SAC_code,
            cgstRate: cgstRate,
            sgstRate: sgstRate,
            declaration: declaration,
            description: description,
            isNew: true,
            isUsed: false,
            price: price,
            requiredFields: requiredFields,
            termsAndCondn: termsAndCondn,
            type: type,
            unit: unit,
            dateAdded: date.toUTCString(),
            dateUpdated: date.toUTCString()
        })
        
        return res.status(200).json({
            message: "Bill master copy successfully created"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.updateCopy = (req,res) => {
    const updates = req.body.updates
    const billMasterid = req.body.id
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
                message: "Only admin can perform billing operations"
            })
        }

        const plantID = admin.get('plantID')

        const billMaster = await firestore.collection(`plants/${plantID}/billMasterCopy`).doc(billMasterid).get()

        if(!billMaster.exists){
            return res.status(404).json({
                message: "Bill Master copy not found"
            })
        }

        if(billMaster.get('isUsed')){
            return res.status(400).json({
                message: "Bill Master copy can't be updated as it has been used"
            })
        }

        // update bill
        updates['dateUpdated']=new Date().toUTCString()
        await firestore.collection(`plants/${plantID}/billMasterCopy`).doc(billMasterid).update(updates)
        
        return res.status(200).json({
            message: "Bill master copy successfully updated"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.deleteCopy = (req,res) => {
    const billMasterid = req.params.id
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
                message: "Only admin can perform billing operations"
            })
        }

        const plantID = admin.get('plantID')

        const billMaster = await firestore.collection(`plants/${plantID}/billMasterCopy`).doc(billMasterid).get()

        if(!billMaster.exists){
            return res.status(404).json({
                message: "Bill Master Copy not found"
            })
        }

        if(billMaster.get('isUsed')){
            return res.status(400).json({
                message: "Bill Master copy can't be deleted as it has been used"
            })
        }

        // delete bill
        await firestore.collection(`plants/${plantID}/billMasterCopy`).doc(billMasterid).delete()
        
        return res.status(200).json({
            message: "Bill master copy successfully deleted"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}