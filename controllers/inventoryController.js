const firebase = require('../config/firebase')
const IndustryRequest = firestore.collection('industriesRequest')
const Email = require('../mail/mailController')

module.exports.addItem = (req,res) => {
    const itemCode = req.body.itemCode
    const itemName = req.body.itemName
    const itemType = req.body.itemType
    const itemUnit = req.body.itemUnit
    // const adminuid = req.userData.uid
    const adminuid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        if(admin.get('accessLevel')!==1){
            return res.status(401).json({
                message: "Only admin can perform operations on inventory"
            })
        }

        const plantID = admin.get('plantID')
        const date = new Date()

        const newItem = await firestore.collection(`${plantID}_inventory`).add({
            dateCreated: date.toUTCString(),
            dateUpdated: date.toUTCString(),
            itemCode: itemCode,
            itemName: itemName,
            itemQuantityAvailable: 0,
            itemTotalQuantityInUnit: 0,
            itemType: itemType,
            itemUnit: itemUnit
        })

        return res.status(201).json({
            message: "Item added successfully",
            item: newItem.data()
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}