const firebase = require('../../config/firebase')
const firestore = firebase.firestore()

module.exports.report = async (req,res) => {
    const plantID = req.userData.plantID;
    const itemType = parseInt(req.query.type);

    if(itemType !== 0 && itemType !== 1){
        return res.status(400).json({
            message: "Invalid itemType query parameter. Must be 0 or 1."
        });
    }

    try {
        const inventory = await firestore.collection(`plants/${plantID}/inventory`).get();

        const usagePromises = [];
        const entriesPromises = [];

        inventory.docs.forEach((doc) => {
            const item = doc.data();

            if((itemType === 1 && item.itemType === "Consumable") || 
               (itemType === 0 && item.itemType === "Non Consumable")){
                return;
            } 

            const usageDocsPromise = doc.ref.collection('usage').get().then(usageDocs => {
                return usageDocs.docs.map(usageDoc => ({
                    itemCode: item.itemCode,
                    itemName: item.itemName,
                    action: "Removed",
                    date: usageDoc.data().dateUsed,
                    unit: usageDoc.data().usageUnit,
                    qty: usageDoc.data().usageQty,
                    location: usageDoc.data().usageLocation
                }));
            });

            const entriesDocsPromise = doc.ref.collection('entries').get().then(entriesDocs => {
                return entriesDocs.docs.map(entryDoc => ({
                    itemCode: item.itemCode,
                    itemName: item.itemName,
                    action: "Added",
                    date: entryDoc.data().dateEntered,
                    unit: entryDoc.data().enteredUnit,
                    qty: entryDoc.data().enteredQty
                }));
            });

            usagePromises.push(usageDocsPromise);
            entriesPromises.push(entriesDocsPromise);
        });

        const usage = await Promise.all(usagePromises).then(results => results.flat());
        const entries = await Promise.all(entriesPromises).then(results => results.flat());
        
        // combine usage and entries array into one
        const combined = usage.concat(entries);

        // sort the combined array by date
        combined.sort((a, b) => new Date(b.date) - new Date(a.date));

        return res.status(200).json({
            data: combined
        });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        });
    }
}

module.exports.getItems = async (req,res) => {
    const plantID = req.userData.plantID

    // get values from query
    const itemType = req.query.type
    const itemid = req.query.itemid

    // if both queries exist together, throw error
    if(itemid && itemType){
        return res.status(400).json({
            message: "Invalid request"
        })
    }

    try {
        let itemsQuery

        // itemsQuery definition
        if(itemid){
            itemsQuery = await firestore.collection(`plants/${plantID}/inventory`).doc(itemid).get()

            if(!itemsQuery.exists){
                return res.status(404).json({
                    message: "Item doesn't exist"
                })
            } else {
                return res.status(200).json({
                    items: itemsQuery.data()
                })
            }
        } else if(itemType){
            if(itemType==="0"){
                itemsQuery = await firestore.collection(`plants/${plantID}/inventory`).where('itemType', '==', "Consumable").get()
            } else if(itemType==="1") {
                itemsQuery = await firestore.collection(`plants/${plantID}/inventory`).where('itemType', '==', "Non Consumable").get()
            } else {
                return res.status(404).json({
                    message: "Item type doesn't exist"
                })
            }
        } else {
            itemsQuery = await firestore.collection(`plants/${plantID}/inventory`).get()
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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.addItem = async (req,res) => {
    const itemCode = req.body.itemCode
    const itemName = req.body.itemName
    const itemType = req.body.itemType
    const itemUnit = req.body.itemUnit
    const plantID = req.userData.plantID

    const requiredFields = ['itemCode', 'itemName', 'itemType', 'itemUnit']
    for (const field of requiredFields) {
        if (!req.body[field]) {
            return res.status(400).json({
                message: `${field} is required`
            })
        }
    }

    try {
        // Already existing item check
        const itemCheck = await firestore.collection(`plants/${plantID}/inventory`).where('itemCode', "==", itemCode).get()
        if(!itemCheck.empty){
            return res.status(409).json({
                message: "Item already exists in the inventory"
            })
        }
        
        // add to inventory
        await firestore.collection(`plants/${plantID}/inventory`).add({
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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.useItem = async (req,res) => {
    const itemid = req.body.itemid
    const usageQty = req.body.usageQty
    const usageUnit = req.body.usageUnit
    const usageLocation = req.body.usageLocation
    const plantID = req.userData.plantID

    const requiredFields = ['itemid', 'usageQty', 'usageUnit', 'usageLocation']

    for (const field of requiredFields) {
        if (!req.body[field]) {
            return res.status(400).json({
                message: `${field} is required`
            })
        }
    }

    try {
        // get item from inventory
        const item = await firestore.collection(`plants/${plantID}/inventory`).doc(itemid).get()
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
        await firestore.collection(`plants/${plantID}/inventory`).doc(itemid).collection('usage').add({
            dateUsed: date,
            usageQty: usageQty,
            usageUnit: itemUnit,
            usageLocation: usageLocation
        })

        // update available quantity
        await firestore.collection(`plants/${plantID}/inventory`).doc(itemid).update({
            itemQuantityAvailable: availableQty-usageQty,
            dateUpdated: date
        })

        return res.status(200).json({
            message: "Item usage added"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.restockItem = async (req,res) => {
    const itemid = req.body.itemid
    const restockItemUnit = req.body.itemUnit
    const restockItemQty = req.body.itemQty
    const plantID = req.userData.plantID

    const requiredFields = ['itemid', 'itemUnit', 'itemQty']

    for (const field of requiredFields) {
        if (!req.body[field]) {
            return res.status(400).json({
                message: `${field} is required`
            })
        }
    }

    try {
        // get item from inventory
        const item = await firestore.collection(`plants/${plantID}/inventory`).doc(itemid).get()
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
        await firestore.collection(`plants/${plantID}/inventory`).doc(itemid).collection('entries').add({
            dateEntered: date,
            enteredQty: restockItemQty,
            enteredUnit: restockItemUnit,
        })

        // update available quantity
        await firestore.collection(`plants/${plantID}/inventory`).doc(itemid).update({
            itemQuantityAvailable: availableQty+restockItemQty,
            dateUpdated: date
        })

        // success response
        return res.status(200).json({
            message: "Item restocked successfully"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.updateItem = async (req,res) => {
    const itemid = req.body.itemid
    const updates = req.body.updates
    const plantID = req.userData.plantID

    if(!itemid){
        return res.status(400).json({
            message: "Item id is required"
        })
    }

    try {
        // change modified date and time
        updates["dateUpdated"]=new Date().toUTCString()

        const item = await firestore.collection(`plants/${plantID}/inventory`).doc(itemid).get()

        if(!item.exists){
            return res.status(404).json({
                message: "Item doesn't exist"
            })
        }

        // update item in collection
        await item.ref.update(updates)

        return res.status(200).json({
            message: "Item updated successfully"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.deleteItem = async (req,res) => {
    const itemid = req.params.itemid
    const plantID = req.userData.plantID

    if(!itemid){
        return res.status(400).json({
            message: "Item id is required"
        })
    }

    try {
        const item = await firestore.collection(`plants/${plantID}/inventory`).doc(itemid).get()

        if(!item.exists){
            return res.status(404).json({
                message: "Item doesn't exist"
            })
        }

        // get all subcollections of item and delete them sequentially
        const subcollections = await item.ref.listCollections()
        for (const subcollection of subcollections) {
            const subcollectionDocs = await subcollection.get()
            for (const doc of subcollectionDocs.docs) {
                await doc.ref.delete()
            }
        }

        // update item in collection
        await item.ref.delete()

        return res.status(200).json({
            message: "Item deleted successfully"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

