const firebase = require('../../config/firebase')
const firestore = firebase.firestore()

module.exports.addInstrumentsModbusAddress = (req,res) => {
    // const adminuid = req.userData.uid
    const adminuid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"
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

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        if(admin.get('accessLevel') !== 1){
            return res.status(401).json({
                message: "Only an admin can access this route"
            })
        }

        const plantID = admin.data().plantID

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
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.addReport = async (plantID, address, timestamp, value) => {
    try {
        const plant = await firestore.collection('plants').doc(plantID).get()

        if(plant.exists){
            
        }

    } catch (error) {
        console.log(error);
    }
}

module.exports.getAllAddress = (req,res) => {
    // const adminuid = req.userData.uid
    const adminuid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"
    const data = req.body.data

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        if(admin.get('accessLevel') !== 1){
            return res.status(401).json({
                message: "Only an admin can access this route"
            })
        }

        const plantID = admin.data().plantID

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
    })
}

module.exports.getReport = (req,res) => {
    // const adminuid = req.userData.uid
    const adminuid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"
    let address = req.query.address
    const year = req.query.year
    let month = req.query.month

    if(address){
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

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        if(admin.get('accessLevel') !== 1){
            return res.status(401).json({
                message: "Only an admin can access this route"
            })
        }
        
        const plantID = admin.data().plantID

        let dataToReturn = []
        if(address){
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
    })
}

module.exports.updateTagNo = (req,res) => {
    // const adminuid = req.userData.uid
    const adminuid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"
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

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        if(admin.get('accessLevel') !== 1){
            return res.status(401).json({
                message: "Only an admin can access this route"
            })
        }

        const plantID = admin.data().plantID

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
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.deleteAddress = (req,res) => {
    // const adminuid = req.userData.uid
    const adminuid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"
    let address = req.params.address

    address = parseInt(address)

    if(address < 0){
        return res.status(400).json({
            message: "address should be a positive number"
        })
    }

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        if(admin.get('accessLevel') !== 1){
            return res.status(401).json({
                message: "Only an admin can access this route"
            })
        }

        const plantID = admin.data().plantID

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
    })
}

module.exports.reporter = async (req,res) => {
    const reportData = require('../../scripts/generated_data.json').data

    try {

        for (let address = 0; address < 20; address++) {

            for (let i = 0; i < reportData.length; i++) {
                const element = reportData[i];
                const values = element.values

                await firestore.collection(`plants/P0/InstrumentData/${address}/reports`).doc(element.date).set({
                    "00:00": values["00:00"],
                    "00:30": values["00:30"],
                    "01:00": values["01:00"],
                    "01:30": values["01:30"],
                    "02:00": values["02:00"],
                    "02:30": values["02:30"],
                    "03:00": values["03:00"],
                    "03:30": values["03:30"],
                    "04:00": values["04:00"],
                    "04:30": values["04:30"],
                    "05:00": values["05:00"],
                    "05:30": values["05:30"],
                    "06:00": values["06:00"],
                    "06:30": values["06:30"],
                    "07:00": values["07:00"],
                    "07:30": values["07:30"],
                    "08:00": values["08:00"],
                    "08:30": values["08:30"],
                    "09:00": values["09:00"],
                    "09:30": values["09:30"],
                    "10:00": values["10:00"],
                    "10:30": values["10:30"],
                    "11:00": values["11:00"],
                    "11:30": values["11:30"],
                    "12:00": values["12:00"],
                    "12:30": values["12:30"],
                    "13:00": values["13:00"],
                    "13:30": values["13:30"],
                    "14:00": values["14:00"],
                    "14:30": values["14:30"],
                    "15:00": values["15:00"],
                    "15:30": values["15:30"],
                    "16:00": values["16:00"],
                    "16:30": values["16:30"],
                    "17:00": values["17:00"],
                    "17:30": values["17:30"],
                    "18:00": values["18:00"],
                    "18:30": values["18:30"],
                    "19:00": values["19:00"],
                    "19:30": values["19:30"],
                    "20:00": values["20:00"],
                    "20:30": values["20:30"],
                    "21:00": values["21:00"],
                    "21:30": values["21:30"],
                    "22:00": values["22:00"],
                    "22:30": values["22:30"],
                    "23:00": values["23:00"],
                    "23:30": values["23:30"],
                })
            }
        }

        return res.status(200).json({
            message: 'ok'
        })

    } catch (error) {
        console.log(error);
    }
}

