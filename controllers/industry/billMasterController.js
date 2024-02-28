const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const db = firebase.database()

module.exports.getMasterCopiesTypes = async (req,res) => {
    try {
        const masterBillTypes = (await db.ref(`BillTypes`).once('value')).val()

        return res.status(200).json({
            types: masterBillTypes
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }
}

module.exports.getMasterCopies = async (req,res) => {
    const plantID = req.userData.plantID
    const billMasterid = req.query.id

    try {
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

const requiredFieldsMasterCopy = [
    'HSN_SAC_code',
    'cgstRate',
    'sgstRate',
    'declaration',
    'description',
    'price',
    'requiredFields',
    'termsAndCondn',
    'type',
    'unit'
]

module.exports.createCopy = async (req,res) => {
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
    const plantID = req.userData.plantID
    console.log(plantID);
    // if any of the above fields are missing, return 400
    for (let i = 0; i < requiredFieldsMasterCopy.length; i++) {
        const element = requiredFieldsMasterCopy[i];

        if(!req.body[element]){
            return res.status(400).json({
                message: `${element} is required`
            })
        }
    }

    try {
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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }
}

module.exports.updateCopy = async (req,res) => {
    const updates = req.body.updates
    const billMasterid = req.body.id
    const plantID = req.userData.plantID

    try {
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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.deleteCopy = async (req,res) => {
    const billMasterid = req.params.id
    const plantID = req.userData.plantID

    try {
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
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}