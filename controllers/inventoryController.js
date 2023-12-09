const firebase = require('../config/firebase')
const firestore = firebase.firestore()
const IndustryRequest = firestore.collection('industriesRequest')
const Email = require('../mail/mailController')

module.exports.getItems = (req,res) => {
    const useruid = req.userData.uid

    firestore.collection('users').doc(useruid).get()
    .then(async user => {
        if(!user.exists){
            return res.status(404).json({
                message: "User doesn't exist"
            })
        }
        
        // Access handling- everyone above operator
        if(user.get('accessLevel')!==1 && user.get('accessLevel')!==2 && user.get('accessLevel')!==3){
            return res.status(401).json({
                message: "User not authorized to perform operations on inventory"
            })
        }

        // get plant id of authorized user
        const plantID = user.get('plantID')

        let itemsQuery

        // get values from query
        const itemType = req.query.type
        const itemid = req.query.itemid

        // if both queries exist together, throw error
        if(itemid!==undefined && itemType!==undefined){
            return res.status(400).json({
                message: "Invalid request"
            })
        }

        // itemsQuery definition
        if(itemid!==undefined){
            itemsQuery = await firestore.collection(`${plantID}_inventory`).doc(itemid).get()

            if(!itemsQuery.exists){
                return res.status(404).json({
                    message: "Item doesn't exist"
                })
            } else {
                return res.status(200).json({
                    items: itemsQuery.data()
                })
            }
        } else if(itemType!==undefined){
            if(itemType==="0"){
                itemsQuery = await firestore.collection(`${plantID}_inventory`).where('itemType', '==', "Consumable").get()
            } else if(itemType==="1") {
                itemsQuery = await firestore.collection(`${plantID}_inventory`).where('itemType', '==', "Non Consumable").get()
            } else {
                return res.status(404).json({
                    message: "Item type doesn't exist"
                })
            }
        } else {
            itemsQuery = await firestore.collection(`${plantID}_inventory`).get()
        }

        const items = [];
        itemsQuery.forEach((doc) => {
            items.push({
                id: doc.id,
                data: doc.data(),
            });
        });

        return res.status(200).json({
            items: items
        })
        
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.addItem = (req,res) => {
    const itemCode = req.body.itemCode
    const itemName = req.body.itemName
    const itemType = req.body.itemType
    const itemUnit = req.body.itemUnit
    const useruid = req.userData.uid

    firestore.collection('users').doc(useruid).get()
    .then(async user => {
        if(!user.exists){
            return res.status(404).json({
                message: "User doesn't exist"
            })
        }
        
        // Access handling- everyone above operator
        if(user.get('accessLevel')!==1 && user.get('accessLevel')!==2 && user.get('accessLevel')!==3){
            return res.status(401).json({
                message: "User not authorized to perform operations on inventory"
            })
        }

        const plantID = user.get('plantID')
        
        // Already existing item check
        const itemCheck = await firestore.collection(`${plantID}_inventory`).where('itemCode', "==", itemCode).get()
        if(!itemCheck.empty){
            return res.status(409).json({
                message: "Item already exists in the inventory"
            })
        }
        
        // add to inventory
        await firestore.collection(`${plantID}_inventory`).add({
            dateCreated: new Date().toUTCString(),
            dateUpdated: new Date().toUTCString(),
            itemCode: itemCode,
            itemName: itemName,
            itemQuantityAvailable: 0,
            itemType: itemType,
            itemUnit: itemUnit
        })

        return res.status(201).json({
            message: "Item added successfully"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.useItem = (req,res) => {
    const itemid = req.body.itemid
    const usageQty = req.body.usageQty
    const usageUnit = req.body.usageUnit
    const useruid = req.userData.uid

    firestore.collection('users').doc(useruid).get()
    .then(async user => {
        if(!user.exists){
            return res.status(404).json({
                message: "User doesn't exist"
            })
        }
        
        // Access handling- everyone above operator
        if(user.get('accessLevel')!==1 && user.get('accessLevel')!==2 && user.get('accessLevel')!==3){
            return res.status(401).json({
                message: "User not authorized to perform operations on inventory"
            })
        }

        const plantID = user.get('plantID')
        
        // get item from inventory
        const item = await firestore.collection(`${plantID}_inventory`).doc(itemid).get()
        const itemUnit = item.get('itemUnit')
        const availableQty = item.get('itemQuantityAvailable')

        if(!item.exists){
            return res.status(404).json({
                message: "Item doesn't exist"
            })
        }

        if(usageUnit!==itemUnit){
            return res.status(400).json({
                message: "Item units are invalid"
            })
        }

        if(availableQty===0){
            return res.status(400).json({
                message: "No quantity left of item, please restock"
            })
        }

        if(usageQty>availableQty){
            return res.status(400).json({
                message: "Requested usage quantity is greater than the available quantity"
            })
        }

        // add usage qty to item's usage collection
        const date = new Date().toUTCString()
        await firestore.collection(`${plantID}_inventory`).doc(itemid).collection('usage').add({
            dateUsed: date,
            usageQty: usageQty,
            usageUnit: itemUnit,
        })

        // update available quantity
        await firestore.collection(`${plantID}_inventory`).doc(itemid).update({
            itemQuantityAvailable: availableQty-usageQty,
            dateUpdated: date
        })

        return res.status(200).json({
            message: "Item usage added"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.restockItem = (req,res) => {
    const itemid = req.body.itemid
    const restockItemUnit = req.body.itemUnit
    const restockItemQty = req.body.itemQty
    const useruid = req.userData.uid

    firestore.collection('users').doc(useruid).get()
    .then(async user => {
        if(!user.exists){
            return res.status(404).json({
                message: "User doesn't exist"
            })
        }
        
        // Access handling- everyone above operator
        if(user.get('accessLevel')!==1 && user.get('accessLevel')!==2 && user.get('accessLevel')!==3){
            return res.status(401).json({
                message: "User not authorized to perform operations on inventory"
            })
        }

        const plantID = user.get('plantID')
        
        // get item from inventory
        const item = await firestore.collection(`${plantID}_inventory`).doc(itemid).get()
        const itemUnit = item.get('itemUnit')
        const availableQty = item.get('itemQuantityAvailable')

        if(!item.exists){
            return res.status(404).json({
                message: "Item doesn't exist"
            })
        }

        if(restockItemUnit!==itemUnit){
            return res.status(400).json({
                message: "Item units are invalid"
            })
        }

        // add restock qty to item's entries collection
        const date = new Date().toUTCString()
        await firestore.collection(`${plantID}_inventory`).doc(itemid).collection('entries').add({
            dateEntered: date,
            enteredQty: restockItemQty,
            enteredUnit: restockItemUnit,
        })

        // update available quantity
        await firestore.collection(`${plantID}_inventory`).doc(itemid).update({
            itemQuantityAvailable: availableQty+restockItemQty,
            dateUpdated: date
        })

        // success response
        return res.status(200).json({
            message: "Item restocked successfully"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.updateItem = (req,res) => {
    const itemid = req.body.itemid
    const updates = req.body.updates
    const useruid = req.userData.uid

    firestore.collection('users').doc(useruid).get()
    .then(async user => {
        if(!user.exists){
            return res.status(404).json({
                message: "User doesn't exist"
            })
        }
        
        // Access handling- everyone above operator
        if(user.get('accessLevel')!==1 && user.get('accessLevel')!==2 && user.get('accessLevel')!==3){
            return res.status(401).json({
                message: "User not authorized to perform operations on inventory"
            })
        }

        if(updates["itemQuantityAvailable"]!==undefined){
            return res.status(400).json({
                message: "Can't update available quantity"
            })
        }

        const plantID = user.get('plantID')
        
        // change modified date and time
        updates["dateUpdated"]=new Date().toUTCString()

        // update item in collection
        await firestore.collection(`${plantID}_inventory`).doc(itemid).update(updates)

        return res.status(200).json({
            message: "Item updated successfully"
        })
        
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.deleteItem = (req,res) => {
    const itemid = req.params.itemid
    const useruid = req.userData.uid

    firestore.collection('users').doc(useruid).get()
    .then(async user => {
        if(!user.exists){
            return res.status(404).json({
                message: "User doesn't exist"
            })
        }
        
        // Access handling- everyone above operator
        if(user.get('accessLevel')!==1 && user.get('accessLevel')!==2 && user.get('accessLevel')!==3){
            return res.status(401).json({
                message: "User not authorized to perform operations on inventory"
            })
        }

        const plantID = user.get('plantID')
        // update item in collection
        await firestore.collection(`${plantID}_inventory`).doc(itemid).delete()

        return res.status(200).json({
            message: "Item deleted successfully"
        })
        
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

