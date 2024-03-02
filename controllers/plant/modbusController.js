const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const { getMessaging } = require('firebase-admin/messaging');

module.exports.addInstrumentsModbusAddress = async (req,res) => {
    const plantID = req.userData.plantID
    const data = req.body.data

    // check if data is an array
    if(!Array.isArray(data)){
        return res.status(400).json({
            message: "Data should be an array"
        })
    }

    // check if the data array matches the structure
    for (let i = 0; i < data.length; i++) {
        const instrument = data[i];
        if(!instrument.hasOwnProperty("TagNo") || !instrument.hasOwnProperty("address")){
            return res.status(400).json({
                message: "TagNo and modbusAddress are required"
            })
        }

        // if any other field is present in the instrument object, return an error
        if(Object.keys(instrument).length !== 2){
            return res.status(400).json({
                message: "Only TagNo and address are allowed"
            })
        }

        if(typeof instrument.TagNo !== "string"){
            return res.status(400).json({
                message: "TagNo should be a string"
            })
        }

        if(typeof instrument.address !== "number"){
            return res.status(400).json({
                message: "address should be a number"
            })
        }

        if(instrument.TagNo.trim().length === 0){
            return res.status(400).json({
                message: "TagNo can't be empty"

            })
        }
    }

    // check if the address is unique
    const addresses = data.map((instrument) => instrument.address)
    const uniqueAddresses = [...new Set(addresses)]
    
    if(addresses.length !== uniqueAddresses.length){
        return res.status(400).json({
            message: "The addresses should be unique"
        })
    }

    try {
        // get the local instruments json file
        const plantInstruments = require(`../../data/instruments/${plantID}.json`).data

        // from the data array obtained from the request, check if the TagNo exists in the local instruments json file
        for (let i = 0; i < data.length; i++) {
            const instrument = data[i];
            const TagNo = instrument.TagNo

            let found = false
            for (let j = 0; j < plantInstruments.length; j++) {
                const instrumentFromLocalData = plantInstruments[j];
                if(instrumentFromLocalData.TagNo === TagNo){
                    found = true
                    break
                }
            }

            if(!found){
                return res.status(400).json({
                    message: `No instrument found with the TagNo ${TagNo}`
                })
            }
        }

        const InstrumentData = await firestore.collection(`plants/${plantID}/InstrumentData`).get()

        if(!InstrumentData.empty){
            // addresses in the data should not be present in the InstrumentData collection as doc id
            const addresses = InstrumentData.docs.map(doc => parseInt(doc.id))
            const uniqueAddresses = [...new Set(addresses)]

            for (let i = 0; i < data.length; i++) {
                const instrument = data[i];
                if(uniqueAddresses.includes(instrument.address)){
                    return res.status(400).json({
                        message: `The address ${instrument.address} is already present`
                    })
                }
            }
            
        } 

        // add the data to the InstrumentData collection
        const promises = data.map(async (instrument) => {
            await firestore.collection(`plants/${plantID}/InstrumentData`).doc(instrument.address.toString()).set({
                TagNo: instrument.TagNo
            })
        })

        await Promise.all(promises)
        
        return res.status(200).json({
            message: 'Modbus address added successfully'
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.addReport = async (plantID, address, timestamp, value) => {
    try {
        const plant = await firestore.collection('plants').doc(plantID).get()
        const adminid = plant.data().selectedAdmin

        const admin = await firestore.collection('users').doc(adminid).get()

        if(admin.exists){
            const fcm_token = admin.data().fcmToken

            if(plant.exists){
                const addressDoc = await firestore.collection(`plants/${plantID}/InstrumentData`).doc(address.toString()).get()
                const TagNo = addressDoc.data().TagNo
    
                if(addressDoc.exists){
                    let today = new Date()
    
                    if(today.getMonth()<10 && today.getDate()<10)
                        today = `${today.getFullYear()+'-0'+(today.getMonth()+1)+'-0'+today.getDate()}`
                    else if(today.getMonth()<10) 
                        today = `${today.getFullYear()+'-0'+(today.getMonth()+1)+'-'+today.getDate()}`
                    else if(today.getDate()<10) 
                        today = `${today.getFullYear()+'-'+(today.getMonth()+1)+'-0'+today.getDate()}`
                    else 
                        today = `${today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate()}`
                    
    
                    await firestore.collection(`plants/${plantID}/InstrumentData/${address}/reports`).doc(today).set({
                        [timestamp]: value
                    })
    
                    addressDoc.ref.update({
                        latestData: {
                            date: today,
                            time: timestamp,
                            value: value
                        }
                    })
    
                    const localPlantInstruments = require(`../../data/instruments/${plantID}.json`).data
                    
                    for (let i = 0; i < localPlantInstruments.length; i++) {
                        const instrument = localPlantInstruments[i];
                        if(instrument.TagNo === TagNo){
                            const lowerLimit = instrument.lowerLimit
                            const upperLimit = instrument.upperLimit
                            
                            const messageText = value < lowerLimit ? 
                                `Reading below the lower limit with value: ${value}` : 
                                `Reading above the upper limit with value: ${value}`

                            if(value < lowerLimit || value > upperLimit){

                                if(fcm_token){
                                    try {
                                        // send notification to plant admin
                                        const message = {
                                            data: {
                                                title: "Instrument flow alert!!!",
                                                body: messageText,
                                                instrument: TagNo,
                                                value: value,
                                                timestamp: timestamp,
                                                lowerLimit: lowerLimit,
                                                upperLimit: upperLimit,
                                                address: address
                                            },
                                            token: fcm_token
                                        }
        
                                        await getMessaging().send(message)
                                        
                                    } catch (error) {
                                        console.log("Notification not sent");
                                    }
                                }
                            }

                            await firestore.collection(`plants/${plantID}/InstrumentAlerts`).add({
                                TagNo: TagNo,
                                timestamp: new Date(),
                                description: messageText
                            })

                            break
                        }
                    }
    
                }
            }
        }

    } catch (error) {
        console.log(error);
    }
}

module.exports.getAllAddress = async (req,res) => {
    const plantID = req.userData.plantID
    const data = req.body.data

    try {
        const InstrumentData = await firestore.collection(`plants/${plantID}/InstrumentData`).get()

        let dataToReturn = []

        if(data){
            // check if the data is an array
            if(!Array.isArray(data)){
                return res.status(400).json({
                    message: "Data should be an array"
                })
            }
            
            // check if the data is an array of strings
            for (let i = 0; i < data.length; i++) {
                const TagNo = data[i];
                if(typeof TagNo !== "string"){
                    return res.status(400).json({
                        message: "Data should be an array of strings"
                    })
                }
            }

            // check if data values are not empty
            for (let i = 0; i < data.length; i++) {
                const TagNo = data[i];
                if(TagNo.trim().length === 0){
                    return res.status(400).json({
                        message: "Data values can't be empty"
                    })
                }
            }
            
            // get local instruments json file
            const plantInstruments = require(`../../data/instruments/${plantID}.json`).data

            // check if the TagNo exists in the local instruments json file
            for (let i = 0; i < data.length; i++) {
                const TagNo = data[i];
                let found = false
                for (let j = 0; j < plantInstruments.length; j++) {
                    const instrumentFromLocalData = plantInstruments[j];
                    if(instrumentFromLocalData.TagNo === TagNo){
                        found = true
                        break
                    }
                }
    
                if(!found){
                    return res.status(400).json({
                        message: `No instrument found with the TagNo ${TagNo}`
                    })
                }
            }

            // get those docs whose TagNo is present in the data array
            InstrumentData.forEach(doc => {
                if(data.includes(doc.data().TagNo)){
                    dataToReturn.push({
                        address: parseInt(doc.id),
                        TagNo: doc.data().TagNo
                    })
                }
            })
        } else {
            InstrumentData.forEach(doc => {
                dataToReturn.push({
                    address: parseInt(doc.id),
                    TagNo: doc.data().TagNo
                })
            })
        
        }
        // sort on the basis of address
        dataToReturn.sort((a,b) => a.address - b.address)

        return res.status(200).json({
            data: dataToReturn
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.getReport = async (req,res) => {
    const plantID = req.userData.plantID
    let address = req.query.address
    const year = req.query.year
    let month = req.query.month

    if(address !== undefined){
        address = parseInt(address)
    
        if(address < 0){
            return res.status(400).json({
                message: "address should be a positive number"
            })
        }
    
        // if year is undefined, return an error
        if(year === undefined){
            return res.status(400).json({
                message: "year is required"
            })
        }
    
        if(month){
            if(month < 1 || month > 12){
                return res.status(400).json({
                    message: "month should be between 1 and 12"
                })
            }
    
            if(month.toString().length === 1){
                month = "0" + month
            }
        }
    }

    try {
        let dataToReturn = []
        if(address !== undefined){
            const InstrumentData = await firestore.collection(`plants/${plantID}/InstrumentData`).doc(address.toString()).get()
    
            if(!InstrumentData.exists){
                return res.status(404).json({
                    message: `No instrument found with the address ${address}`
                })
            }

            const reports = await firestore.collection(`plants/${plantID}/InstrumentData/${address}/reports`).get()
    
            reports.forEach(doc => {
                const date = (doc.id).toString()
                const yearFromDoc = date.substring(0,4)
    
                // sort doc.data() on the basis of time (time format is 24hours)
                const sortedData = Object.keys(doc.data()).sort((a,b) => {
                    const aHour = parseInt(a.substring(0,2))
                    const bHour = parseInt(b.substring(0,2))
    
                    return aHour - bHour
                })
    
                // add the sorted data to the doc.data()
                const sortedDocData = {}
                sortedData.forEach(key => {
                    sortedDocData[key] = doc.data()[key]
                })
    
                doc.data = () => sortedDocData
    
                if(yearFromDoc === year){
                    if(month){
                        const monthFromDoc = date.substring(5,7)
                        if(monthFromDoc === month){
                            dataToReturn.push({
                                date: doc.id,
                                values: doc.data()
                            })
                        }
                    } else {
                        dataToReturn.push({
                            date: doc.id,
                            values: doc.data()
                        })
                    }
                }
            })
        } else {
            const allAddresses = await firestore.collection(`plants/${plantID}/InstrumentData`).get()

            const promises = allAddresses.docs.map(async (address) => {
                dataToReturn.push({
                    address: parseInt(address.id),
                    TagNo: address.data().TagNo,
                    data: address.data().latestData
                })
            })

            await Promise.all(promises)
        }

        return res.status(200).json({
            data: dataToReturn
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.updateTagNo = async (req,res) => {
    const plantID = req.userData.plantID
    const address = req.body.address
    const TagNo = req.body.TagNo

    if(address === undefined || TagNo === undefined){
        return res.status(400).json({
            message: "address and TagNo are required"
        })
    }

    // if any other field is present in the instrument object, return an error
    if(Object.keys(req.body).length !== 2){
        return res.status(400).json({
            message: "Invalid Field Present"
        })
    }

    if(typeof address !== "number"){
        return res.status(400).json({
            message: "address should be a number"
        })
    }

    if(typeof TagNo !== "string"){
        return res.status(400).json({
            message: "TagNo should be a string"
        })
    }

    if(TagNo.trim().length === 0){
        return res.status(400).json({
            message: "TagNo can't be empty"
        })
    }

    if(address < 0){
        return res.status(400).json({
            message: "address should be a positive number"
        })
    }

    try {
        const InstrumentData = await firestore.collection(`plants/${plantID}/InstrumentData`).doc(address.toString()).get()

        if(!InstrumentData.exists){
            return res.status(404).json({
                message: `No instrument found with the address ${address}`
            })
        }

        // get local instruments json file
        const plantInstruments = require(`../../data/instruments/${plantID}.json`).data

        // check if the TagNo exists in the local instruments json file
        let found = false
        for (let j = 0; j < plantInstruments.length; j++) {
            const instrumentFromLocalData = plantInstruments[j];
            if(instrumentFromLocalData.TagNo === TagNo){
                found = true
                break
            }
        }

        if(!found){
            return res.status(400).json({
                message: `No instrument found with the TagNo ${TagNo}`
            })
        }

        // check if the TagNo is already present in the InstrumentData collection
        const InstrumentDataWithSameTagNo = await firestore.collection(`plants/${plantID}/InstrumentData`).where("TagNo", "==", TagNo).get()

        if(!InstrumentDataWithSameTagNo.empty){
            return res.status(400).json({
                message: `The TagNo ${TagNo} is already present`
            })
        }

        // update the TagNo
        await InstrumentData.ref.update({
            TagNo: TagNo
        })

        return res.status(200).json({
            message: "TagNo updated successfully"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.deleteAddress = async (req,res) => {
    const plantID = req.userData.plantID
    let address = req.params.address

    address = parseInt(address)

    if(address < 0){
        return res.status(400).json({
            message: "address should be a positive number"
        })
    }

    try {
        const InstrumentData = await firestore.collection(`plants/${plantID}/InstrumentData`).doc(address.toString()).get()

        if(!InstrumentData.exists){
            return res.status(404).json({
                message: `No instrument found with the address ${address}`
            })
        }

        // delete the subcollections of the address
        const subcollections = await InstrumentData.ref.listCollections()
        const promises = subcollections.map(async (subcollection) => {
            const docs = await subcollection.listDocuments()
            const promises = docs.map(async (doc) => {
                await doc.delete()
            })

            await Promise.all(promises)
        })

        await Promise.all(promises)

        // delete the address
        await InstrumentData.ref.delete()

        return res.status(200).json({
            message: "Address deleted successfully"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}
