const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const Excel = require('exceljs')
const fs = require('fs')
const db = firebase.database()

function extractInstrumentCode(inputString) {
    const match = inputString.match(/^[A-Za-z\s]+/);
    return match ? match[0] : null;
}

const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    timeZoneName: 'short',
};

const header = [
    "TagNo",
    "Instrument",
    "Location",
    "From",
    "InstrumentRangeFrom",
    "To",
    "InstrumentRangeTo",
    "PAndIDNo",
    "Purpose",
    "Qty",
    "Fluid",
    "TypeOfInstorWorkingPrinciple",
    "OCPress_Kg/cm2",
    "OCTemp_degC",
    "OCFlow_m3/hr",
    "Units",
    "WettedPart",
    "Sunbber",
    "isActive",
    "dateAdded"
]

// Purpose is not a required field- fix this
const requiredFields = [
    "TagNo",
    "Instrument",
    "Location",
    "PAndIDNo",
    "Purpose",
    "isActive"
]

const stringFields = [
    "TagNo",
    "Instrument",
    "Location",
    "From",
    "To",
    "PAndIDNo",
    "Purpose",
    "Fluid",
    "TypeOfInstorWorkingPrinciple",
    "Units",
    "WettedPart",
    "Sunbber",
    "isActive"
]

const stringOrNumberFields = [
    "InstrumentRangeFrom",
    "InstrumentRangeTo",
    "OCPress_Kg_cm2",
    "OCTemp_degC",
    "OCFlow_m3_hr"
]

const numberFields = [
    "Qty",
]

module.exports.bulkAddInstruments = async (req,res) => {
    const instrument_sheet = req.file
    const plantID = req.userData.plantID

    // determin the last 5 characters of the file name
    const fileExtension = instrument_sheet.filename.slice(-5)

    // check if the file extension is .xlsx
    if(fileExtension !== '.xlsx'){
        fs.unlink(instrument_sheet.path, () => {})
        return res.status(400).json({
            message: "Only xlsx files are allowed"
        })
    }

    try {
        const workbook = new Excel.Workbook();
        await workbook.xlsx.readFile(instrument_sheet.path);
        fs.unlink(instrument_sheet.path, () => {})

        const worksheet = workbook.getWorksheet(1);
        
        // get the first row
        const firstRow = worksheet.getRow(1).values;
        
        // check if the first row is equal to the header array element wise
        for (let i = 1; i < firstRow.length; i++) {
            const headerObtained = firstRow[i].trim()
            const headerRequired = header[i-1]

            if(headerRequired === "PAndIDNo"){
                if(headerObtained === "P&IDNo"){
                    continue
                } else {
                    return res.status(400).json({
                        message: "The header row format is wrong",
                        metadata: {
                            headerObtained: headerObtained,
                            headerRequired: "P&IDNo"
                        }
                    })
                }
            }
            if(headerObtained !== headerRequired){
                return res.status(400).json({
                    message: "The header row format is wrong",
                    metadata: {
                        headerObtained: headerObtained,
                        headerRequired: headerRequired
                    }
                })
            }
        }

        // get the instrument code from the real time database at path InstrumentCodes/PlantID
        const instrumentCodes = await db.ref(`InstrumentCodes/${plantID}`).once('value')

        // json object containing instrument codes as "instrumentCode": "instrumentName"
        const instrumentCodesData = instrumentCodes.val() 
        
        let jsonArray = []
        // traverse through the rows of the sheet

        const promises = [];

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return; // skip the first row (header row)

            const rowData = row.values;
            let data = {};
            let instrumentName;

            for (let j = 1; j < firstRow.length; j++) {
                const key = firstRow[j].trim();
                let cellValue = rowData[j];

                if (j === 1) {
                    let instrumentCode = extractInstrumentCode(cellValue).trim();
                    instrumentName = instrumentCodesData[instrumentCode].replace(/\s/g, '');
                }

                if (cellValue) {
                    data[key] = cellValue;
                }
            }

            data["dateAdded"] = new Date().toLocaleString('en-US', options);

            const instrumentPromise = firestore.collection('plants').doc(plantID).collection(instrumentName).where("TagNo", '==', data["TagNo"]).get()
                .then(async instrument => {
                    if (instrument.empty) {
                        await firestore.collection('plants').doc(plantID).collection(instrumentName).add(data)
                        jsonArray.push(data)
                    }
                    return Promise.resolve();
                });

            promises.push(instrumentPromise);
        });

        await Promise.all(promises);

        const jsonToStore = {
            data: jsonArray
        }

        // store the instruments data locally
        fs.writeFile(`./data/instruments/${plantID}.json`, JSON.stringify(jsonToStore), (err) => {
            if(err){
                console.log(err);
            }
        })
        
        return res.status(200).json({
            message: 'Instrument(s) added successfully'
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.addInstrument = async (req,res) => {
    const plantID = req.userData.plantID
    const TagNo = req.body.TagNo
    const Instrument = req.body.Instrument
    const Location = req.body.Location
    const From = req.body.From
    const InstrumentRangeFrom = req.body.InstrumentRangeFrom
    const To = req.body.To
    const InstrumentRangeTo = req.body.InstrumentRangeTo
    const PAndIDNo = req.body.PAndIDNo
    const Purpose = req.body.Purpose
    const Qty = req.body.Qty
    const Fluid = req.body.Fluid
    const TypeOfInstorWorkingPrinciple = req.body.TypeOfInstorWorkingPrinciple
    const OCPress_Kg_cm2 = req.body.OCPress_Kg_cm2
    const OCTemp_degC = req.body.OCTemp_degC
    const OCFlow_m3_hr = req.body.OCFlow_m3_hr
    const Units = req.body.Units
    const WettedPart = req.body.WettedPart
    const Sunbber = req.body.Sunbber
    const isActive = req.body.isActive
    const dateAdded = new Date().toLocaleString('en-US', options);
    const Body = req.body

    // check if all the required fields are present
    for (let i = 0; i < requiredFields.length; i++) {
        const field = requiredFields[i];
        if(!req.body[field]|| req.body[field] === null || req.body[field] === ""){
            return res.status(400).json({
                message: `${field} is required`
            })
        }
    }

    let validationError = false;

    Object.keys(Body).forEach(key => {
        const value = Body[key];

        // if key is not present in the headers array, set validationError to true
        if (!header.includes(key)) {
            validationError = true;
            res.status(400).json({
                message: `${key} is not a valid field`
            });
            return;
        }

        // if the value is empty, set validationError to true
        if (!value || value === "") {
            validationError = true;
            res.status(400).json({
                message: `${key} value can't be empty`
            });
            return;
        }

        // if the key is in numberFields array and the value is not a number, set validationError to true
        if (numberFields.includes(key) && typeof value !== 'number') {
            validationError = true;
            res.status(400).json({
                message: `${key} must be a number`
            });
            return;
        }

        // if the key is in stringFields array and the value is not a string, set validationError to true
        if (stringFields.includes(key) && typeof value !== 'string') {
            validationError = true;
            res.status(400).json({
                message: `${key} must be a string`
            });
            return;
        }

        // if the key is in stringOrNumberFields array and the value is not a string or a number, set validationError to true
        if (stringOrNumberFields.includes(key) && typeof value !== 'string' && typeof value !== 'number') {
            validationError = true;
            res.status(400).json({
                message: `${key} must be a string or a number`
            });
            return;
        }

        // if the key is isActive and the value is not Y or N, set validationError to true
        if (key === 'isActive' && value !== 'Y' && value !== 'N') {
            validationError = true;
            res.status(400).json({
                message: "isActive must be Y or N"
            });
            return;
        }
    });

    if(validationError){
        return;
    }

    try {
        // get the instrumentCode from the TagNo
        const instrumentCode = extractInstrumentCode(TagNo).trim()

        // get the instrument name from the instrument code using realtime database
        let instrumentName = (await db.ref(`InstrumentCodes/${plantID}/${instrumentCode}`).once('value')).val()
        if(instrumentName === undefined || instrumentName === null){
            return res.status(400).json({
                message: "No instrument name found for the given TagNo"
            })
        }

        instrumentName = instrumentName.replace(/\s/g, '')

        // check if the instrument with the given tag number already exists in the instrumentName collection
        const instrument = await firestore.collection('plants').doc(plantID).collection(instrumentName).where("TagNo", '==', TagNo).get()
        
        // if no instrument with the given tag number exists, add the instrument to the instrumentName collection
        if(instrument.empty){
            // only insert those values which are not null or undefined
            let data = {
                TagNo: TagNo,
                Instrument: Instrument,
                Location: Location,
                PAndIDNo: PAndIDNo,
                Purpose: Purpose,
                isActive: isActive,
                dateAdded: dateAdded
            }

            // Optional fields
            if(From) data["From"] = From
            if(To) data["To"] = To
            if(InstrumentRangeFrom) data["InstrumentRangeFrom"] = InstrumentRangeFrom
            if(InstrumentRangeTo) data["InstrumentRangeTo"] = InstrumentRangeTo
            if(Qty) data["Qty"] = Qty
            if(Fluid) data["Fluid"] = Fluid
            if(TypeOfInstorWorkingPrinciple) data["TypeOfInstorWorkingPrinciple"] = TypeOfInstorWorkingPrinciple
            if(OCPress_Kg_cm2) data["OCPress_Kg_cm2"] = OCPress_Kg_cm2
            if(OCTemp_degC) data["OCTemp_degC"] = OCTemp_degC
            if(OCFlow_m3_hr) data["OCFlow_m3_hr"] = OCFlow_m3_hr
            if(Units) data["Units"] = Units
            if(WettedPart) data["WettedPart"] = WettedPart
            if(Sunbber) data["Sunbber"] = Sunbber

            await firestore.collection('plants').doc(plantID).collection(instrumentName).add(data)
        } else {
            return res.status(400).json({
                message: "Instrument with the given TagNo already exists"
            })
        }

        return res.status(200).json({
            message: 'Instrument added successfully'
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.addInstrumentsModbusAddress = (req,res) => {
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
        for (let i = 0; i < plantInstruments.length; i++) {
            const instrument = plantInstruments[i];
            const TagNo = instrument.TagNo

            let found = false
            for (let j = 0; j < data.length; j++) {
                const instrToAdd = data[j];
                if(instrToAdd.TagNo === TagNo){
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

module.exports.updateInstrument = async (req,res) => {
    const plantID = req.userData.plantID
    const TagNo = req.body.TagNo
    const updates = req.body.updates
    const Body = updates
    
    // check if TagNo is present
    if(TagNo === undefined || TagNo === null || TagNo === ""){
        return res.status(400).json({
            message: "TagNo is required"
        })
    }

    // check if the updates is an object and not an array
    if(updates === undefined || updates === null || updates === "" || typeof updates !== 'object' || Array.isArray(updates)){
        return res.status(400).json({
            message: "updates must be a JSON object"
        })
    }

    let validationError = false;

    Object.keys(Body).forEach(key => {
        const value = Body[key];

        // if key is not present in the headers array, set validationError to true
        if (!header.includes(key)) {
            validationError = true;
            res.status(400).json({
                message: `${key} is not a valid field`
            });
            return;
        }

        // if the value is empty, set validationError to true
        if (value === undefined || value === null || value === "") {
            validationError = true;
            res.status(400).json({
                message: `${key} value can't be empty`
            });
            return;
        }

        // if the key is in numberFields array and the value is not a number, set validationError to true
        if (numberFields.includes(key) && typeof value !== 'number') {
            validationError = true;
            res.status(400).json({
                message: `${key} must be a number`
            });
            return;
        }

        // if the key is in stringFields array and the value is not a string, set validationError to true
        if (stringFields.includes(key) && typeof value !== 'string') {
            validationError = true;
            res.status(400).json({
                message: `${key} must be a string`
            });
            return;
        }

        // if the key is in stringOrNumberFields array and the value is not a string or a number, set validationError to true
        if (stringOrNumberFields.includes(key) && typeof value !== 'string' && typeof value !== 'number') {
            validationError = true;
            res.status(400).json({
                message: `${key} must be a string or a number`
            });
            return;
        }

        // if the key is isActive and the value is not Y or N, set validationError to true
        if (key === 'isActive' && value !== 'Y' && value !== 'N') {
            validationError = true;
            res.status(400).json({
                message: "isActive must be Y or N"
            });
            return;
        }
    });

    if(validationError){
        return;
    }

    try {
        // get the instrumentCode from the TagNo
        const instrumentCode = extractInstrumentCode(TagNo).trim()

        // get the instrument name from the instrument code using realtime database
        let instrumentName = (await db.ref(`InstrumentCodes/${plantID}/${instrumentCode}`).once('value')).val()
        if(instrumentName === undefined || instrumentName === null){
            return res.status(404).json({
                message: "No instrument name found for the given TagNo"
            })
        }

        instrumentName = instrumentName.replace(/\s/g, '')

        // check if the instrument with the given tag number exists in the instrumentName collection
        const instrument = await firestore.collection('plants').doc(plantID).collection(instrumentName).where("TagNo", '==', TagNo).get()
        
        // if no instrument with the given tag number exists, return an error
        if(instrument.empty){
            return res.status(404).json({
                message: "No instrument found with the given TagNo"
            })
        }

        // update the instrument
        await firestore.collection('plants').doc(plantID).collection(instrumentName).doc(instrument.docs[0].id).update(updates)
        
        // update the instrument in the local json file
        const plantInstruments = require(`../../data/instruments/${plantID}.json`).data

        for (let i = 0; i < plantInstruments.length; i++) {
            const instrument = plantInstruments[i];
            if(instrument["TagNo"] === TagNo){
                Object.keys(updates).forEach(key => {
                    instrument[key] = updates[key]
                })
                break
            }
        }

        return res.status(200).json({
            message: 'Instrument updated successfully'
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.deleteInstrument = async (req,res) => {
    const plantID = req.userData.plantID
    const TagNo = req.params.TagNo

    // check if TagNo is present
    if(!TagNo){
        return res.status(400).json({
            message: "TagNo is required"
        })
    }

    try {
        // get the instrumentCode from the TagNo
        const instrumentCode = extractInstrumentCode(TagNo).trim()

        // get the instrument name from the instrument code using realtime database
        let instrumentName = (await db.ref(`InstrumentCodes/${plantID}/${instrumentCode}`).once('value')).val()

        if(instrumentName === undefined || instrumentName === null){
            return res.status(400).json({
                message: "No instrument name found for the given TagNo"
            })
        }

        instrumentName = instrumentName.replace(/\s/g, '')

        // check if the instrument with the given tag number exists in the instrumentName collection
        const instrument = await firestore.collection('plants').doc(plantID).collection(instrumentName).where("TagNo", '==', TagNo).get()
        
        // if no instrument with the given tag number exists, return an error
        if(instrument.empty){
            return res.status(400).json({
                message: "No instrument found with the given TagNo"
            })
        }

        // delete the instrument
        await firestore.collection('plants').doc(plantID).collection(instrumentName).doc(instrument.docs[0].id).delete()
        
        // delete the instrument from the local json file
        const plantInstruments = require(`../../data/instruments/${plantID}.json`).data

        for (let i = 0; i < plantInstruments.length; i++) {
            const instrument = plantInstruments[i];
            if(instrument["TagNo"] === TagNo){
                plantInstruments.splice(i,1)
                break
            }
        }

        return res.status(200).json({
            message: 'Instrument deleted successfully'
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.addFilters = (req,res) => {
    const plantID = req.userData.plantID
    const filters = req.body.filters

    // check if filters is an array
    if(!Array.isArray(filters)){
        return res.status(400).json({
            message: "Filters should be an array"
        })
    }

    // check if the filter array matches the structure
    for (let i = 0; i < filters.length; i++) {
        const filter = filters[i];
        if(!filter.hasOwnProperty("filterName") || !filter.hasOwnProperty("filterItem")){
            return res.status(400).json({
                message: "filterName and filterItem are required"
            })
        }

        if(typeof filter.filterName !== "string"){
            return res.status(400).json({
                message: "filterName should be a string"
            })
        }

        if(!Array.isArray(filter.filterItem)){
            return res.status(400).json({
                message: "filterItem should be an array"
            })
        }

        if(!filter.filterItem.every((value) => typeof value === 'string' || typeof value === 'number')){
            return res.status(400).json({
                message: "filterItem should be an array of strings or numbers"
            })
        }

        if(filter.filterItem.length === 0){
            return res.status(400).json({
                message: "filterItem can't be empty"

            })
        }

        if(filter.filterName.trim().length === 0){
            return res.status(400).json({
                message: "filterName can't be empty"

            })
        }

    }

    try {
        filters.map(async (filterObtained) => {
            const filterObtainedName = filterObtained.filterName
            const filterObtainedItems = filterObtained.filterItem

            const filter = await firestore.collection(`plants/${plantID}/processFilterCategory`).where("filterName", "==", filterObtainedName).get()

            // if filter exists, check the filterItems array and add those fields from the filterItems array which are not present in the filterItem array of the filter
            if(!filter.empty){
                const filterItem = filter.docs[0].data().filterItem

                filterObtainedItems.forEach(item => {
                    if(!filterItem.includes(item)){
                        filterItem.push(item)
                    }
                })

                await firestore.collection(`plants/${plantID}/processFilterCategory`).doc(filter.docs[0].id).update({
                    filterItem: filterItem
                })
            } else {
                // if filter does not exist, create a new filter
                await firestore.collection(`plants/${plantID}/processFilterCategory`).add({
                    filterName: filterObtainedName,
                    filterItem: filterObtainedItems
                })
            }
        })

        return res.status(200).json({
            message: 'Filter added successfully'
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

/*
    Object format
    {
        "filterName": "Fluid",
        "filterItem": ["Water", "Steam"]
    }
*/
const filterObjectMaker = (instrument, filterName, filterItem) => {
    const filterItemArray = []

    filterItem.forEach(item => {       
        if(filterName === "I/O"){
            const location = instrument["Location"].toLowerCase()
            if(item === "Outlet") {
                if(location.includes("outlet") || location.includes("discharge")) {
                    filterItemArray.push(item)
                }
            } else if(item === "Inlet" && location.includes("inlet")) {
                filterItemArray.push(item)
            }
        } else {
            if(typeof item === "number"){
                item = item.toString()
            }

            if(instrument[filterName]?.toString().toLowerCase().includes(item.toLowerCase()) && !filterItemArray.includes(item)){
                filterItemArray.push(item)
            } 
        }
    })

    return {
        filterName: filterName,
        filterItem: filterItemArray
    }
}

module.exports.getFilters = async (req,res) => {
    const plantID = req.userData.plantID
    const categoryName = req.query.category
    const filterName = req.query.filterName

    if(categoryName && filterName){
        return res.status(400).json({
            message: "You can only query for one category or one filter"
        })
    }

    try {
        let data = []
        const filters = await firestore.collection(`plants/${plantID}/processFilterCategory`).get()

        if(categoryName) {
            // Get all the instruments of the category
            const categoriesWithInstruments = await firestore.collection(`plants/${plantID}/processInstrCategory`).where("categoryName", "==", categoryName).get()

            if(categoriesWithInstruments.empty){
                return res.status(400).json({
                    message: "No instruments found for the given category"
                })
            }

            categoriesWithInstruments.forEach(category => {
                category.data().instrArray.forEach(instrument => {
                    data.push(instrument)
                })
            })

            let instrumentArray = []
            const promises = data.map(async (instrumentCode) => {
                // using the instrument code, get the instrument name from the realtime database
                let instrumentName = (await db.ref(`InstrumentCodes/${plantID}/${instrumentCode}`).once('value')).val()

                // replace all the whitespaces in the instrument name
                instrumentName = instrumentName.replace(/\s/g, '')

                // fetch all the instruments from the firestore collection
                const instruments = await firestore.collection(`plants/${plantID}/${instrumentName}`).get()

                instruments.forEach(instrument => {
                    instrumentArray.push(instrument.data())
                })
            })

            await Promise.all(promises)
            data = []
            // iterate through all the filters and check if the filter is present in the instrument
            for (let i = 0; i < instrumentArray.length; i++) {
                const instrument = instrumentArray[i];

                filters.forEach(filter => {
                    const filterName = filter.data().filterName
                    const filterItem = filter.data().filterItem

                    const filterObject = filterObjectMaker(instrument, filterName, filterItem)
                    const index = data.findIndex((element) => element.filterName === filterObject.filterName)

                    if(index === -1){
                        data.push(filterObject)
                    } else {
                        filterObject.filterItem.forEach(item => {
                            if(!data[index].filterItem.includes(item)){
                                data[index].filterItem.push(item)
                            }
                        })
                    }
                })
            }
            
        } else if (filterName) {
            filters.forEach(filter => {
                if(filter.data().filterName === filterName){
                    data.push(filter.data())
                    return
                }
            })
        } else {
            filters.forEach(filter => {
                data.push(filter.data())
            })
        }

        return res.status(200).json({
            data: data
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

/**
 * Search Queries
 * 1. Instrument
 * 2. Location
 * 3. Fluid
 * 4. TypeOfInstorWorkingPrinciple
 * 5. I/O
 * 6. Category
 */
module.exports.getInstrCategories = async (req,res) => {
    const plantID = req.userData.plantID
    const categoryName = req.query.category
    const instrument = req.query.instrument
    const location = req.query.location
    const fluid = req.query.fluid
    const typeOfInstorWorkingPrinciple = req.query.tiowp
    const io = req.query.io

    // category query array can only contain one element
    if(categoryName !== undefined && Array.isArray(categoryName) && categoryName.length > 1){
        return res.status(400).json({
            message: "You can only query for one category"
        })
    }

    try {
        let data = []
        if(categoryName){
            const categoriesWithInstruments = await firestore.collection(`plants/${plantID}/processInstrCategory`).where("categoryName", "==", categoryName).get()

            if(categoriesWithInstruments.empty){
                return res.status(400).json({
                    message: "No instruments found for the given category"
                })
            }

            categoriesWithInstruments.forEach(category => {
                category.data().instrArray.forEach(instrument => {
                    data.push(instrument)
                })
            })

            let instrumentArray = []
            const promises = data.map(async (instrumentCode) => {
                // using the instrument code, get the instrument name from the realtime database
                let instrumentName = (await db.ref(`InstrumentCodes/${plantID}/${instrumentCode}`).once('value')).val()

                // replace all the whitespaces in the instrument name
                instrumentName = instrumentName.replace(/\s/g, '')

                // fetch all the instruments from the firestore collection
                const instruments = await firestore.collection(`plants/${plantID}/${instrumentName}`).get()

                instruments.forEach(instrument => {
                    instrumentArray.push(instrument.data())
                })
            })

            await Promise.all(promises)

            data = instrumentArray 
            
            if(instrument !== undefined || location !== undefined || fluid !== undefined || typeOfInstorWorkingPrinciple !== undefined || io !== undefined){
                let filteredData = await searchQueries(req.query, plantID)
                
                if(data.length !== 0 && filteredData.length !== 0){
                    // if an element of data is not present in filteredData, remove it from data
                    data = data.filter((instrument) => {
                        for (let i = 0; i < filteredData.length; i++) {
                            const filteredInstrument = filteredData[i];
                            if(instrument["TagNo"] === filteredInstrument["TagNo"]){
                                return true
                            }
                        }
                        return false
                    })
                } else {
                    data = []
                } 
            } 

        } else {
            const categoriesWithInstruments = await firestore.collection(`plants/${plantID}/processInstrCategory`).get()

            categoriesWithInstruments.forEach(category => {
                data.push(category.data().categoryName)
            })
        }

        return res.status(200).json({
            count: data.length,
            data: data
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }
    
}

const searchQueries = async (queryObject, plantID) => {
    // if the query object consists of keys which are strings, convert them to arrays
    let Query = {}
    Object.keys(queryObject).forEach(key => {
        let value = queryObject[key]

        if(typeof value === "string"){
            Query[key] = [value]
        } else {
            Query[key] = value
        }
    })

    let data = []

    // get all the collections in the plant
    const collections = await firestore.collection(`plants`).doc(plantID).listCollections()

    if(Query['instrument'] || Query['tiowp'] || Query['fluid']) {
        const promises = collections.map(async (collection) => {
            let query = collection
            const Instrument = Query["instrument"]
            const TypeOfInstorWorkingPrinciple = Query["tiowp"]
            const Fluid = Query["fluid"]

            if(Instrument){
                query = query.where("Instrument", 'in', Instrument)
            }
            if(TypeOfInstorWorkingPrinciple){
                query = query.where("TypeOfInstorWorkingPrinciple", 'in', TypeOfInstorWorkingPrinciple)
            }
            if(Fluid){
                query = query.where("Fluid", 'in', Fluid)
            }

            const result = await query.get()
            result.forEach(doc => {
                data.push(doc.data())
            })
        })
        
        await Promise.all(promises)
    }
    
    const plantInstruments = require(`../../data/instruments/${plantID}.json`).data

    let lioData = []
    if(Query["location"] || Query["io"]){

        if(Query["location"] && Query["io"]){
            const locationArray = Query["location"]
            const ioArray = Query["io"]

            for (let i = 0; i < plantInstruments.length; i++) {
                const instrument = plantInstruments[i];

                for (let j = 0; j < locationArray.length; j++) {
                    
                    if(instrument["Location"].toLowerCase().includes(locationArray[j].toLowerCase())){
                        for (let k = 0; k < ioArray.length; k++) {
                            if(ioArray[k] === "outlet"){
                                let flag = false
                                if(instrument["Location"].toLowerCase().includes("outlet"))
                                    flag = true
                                if(!flag && !instrument["Location"].toLowerCase().includes("discharge"))
                                    continue
                            } else if (!instrument["Location"].toLowerCase().includes(ioArray[k].toLowerCase())){
                                continue
                            }

                            lioData.push(instrument)
                        }
                    }
                }
            }    
        } else if(Query["location"]) {
            const locationArray = Query["location"]

            for (let i = 0; i < plantInstruments.length; i++) {
                const instrument = plantInstruments[i];
                
                for (let j = 0; j < locationArray.length; j++) {
                    if(instrument["Location"].toLowerCase().includes(locationArray[j].toLowerCase())){
                        lioData.push(instrument)
                    }
                }
            }
        } else if(Query["io"]) {
            const ioArray = Query["io"]

            for (let i = 0; i < plantInstruments.length; i++) {
                const instrument = plantInstruments[i];
                
                for (let j = 0; j < ioArray.length; j++) {

                    if(ioArray[j] === "outlet"){
                        let flag = false
                        if(instrument["Location"].toLowerCase().includes("outlet"))
                            flag = true
                        if(!flag && !instrument["Location"].toLowerCase().includes("discharge"))
                            continue
                    } else if (!instrument["Location"].toLowerCase().includes(ioArray[j].toLowerCase()))
                        continue

                    lioData.push(instrument)
                }
            }
        }  
    }

    if(data.length !== 0 && lioData.length !== 0){
        // if an element of data is not present in lioData, remove it from data
        data = data.filter((instrument) => {
            for (let i = 0; i < lioData.length; i++) {
                const lioInstrument = lioData[i];
                if(instrument["TagNo"] === lioInstrument["TagNo"]){
                    return true
                }
            }
            return false
        })
    } else if(data.length !== 0){
        if(Query["location"] || Query["io"]){
            data = []
        }
    } else if(lioData.length !== 0){
        if(Query["instrument"] || Query["fluid"] || Query["tiowp"]){
            data = []
        } else 
            data = lioData
    }
    return data
}

module.exports.getAllTagNos = async (req,res) => {
    const plantID = req.userData.plantID

    try {
        const localInstruments = require(`../../data/instruments/${plantID}.json`).data

        let data = []
        for (let i = 0; i < localInstruments.length; i++) {
            data.push(localInstruments[i]["TagNo"])
        }

        return res.status(200).json({
            count: data.length,
            data: data
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }
}

/**
    // DUMP- 1
    const collections = await firestore.collection(`plants`).doc(plantID).listCollections()

    const promises = collections.map(async (collection) => {
        const querySnapshot = await collection.get();

        querySnapshot.docs.forEach(doc => {
            const DocData = doc.data()
            if (DocData["TagNo"] && DocData["Location"] && DocData["Instrument"] && DocData["P&IDNo"] && DocData["isActive"]) {
                Query.forEach(query => {
                    const instrument = query["instrument"] ? query["instrument"].toLowerCase() : undefined
                    const location = query["location"] ? query["location"].toLowerCase() : undefined
                    const fluid = query["fluid"] ? query["fluid"].toLowerCase() : undefined
                    const typeOfInstorWorkingPrinciple = query["tiowp"] ? query["tiowp"].toLowerCase() : undefined
                    const io = query["io"] ? query["io"].toLowerCase() : undefined

                    if(instrument && instrument !== DocData["Instrument"].toLowerCase()){
                        return 
                    } 
                    if(fluid && DocData["Fluid"] && !DocData["Fluid"].toLowerCase().includes(fluid)){
                        return 
                    } else if(fluid && !DocData["Fluid"])
                        return
                    if(location && DocData["Location"] && !DocData["Location"].toLowerCase().includes(location)){
                        return
                    } 
                    if(typeOfInstorWorkingPrinciple && DocData["TypeOfInstorWorkingPrinciple"]){
                        if(typeof DocData["TypeOfInstorWorkingPrinciple"] === "string" && !DocData["TypeOfInstorWorkingPrinciple"].toLowerCase().includes(typeOfInstorWorkingPrinciple)){
                            return
                        } 
                        if (typeof DocData["TypeOfInstorWorkingPrinciple"] === "number" && DocData["TypeOfInstorWorkingPrinciple"] !== typeOfInstorWorkingPrinciple){
                            return
                        }
                    } else if(typeOfInstorWorkingPrinciple && !DocData["TypeOfInstorWorkingPrinciple"])
                        return
                    if(io && DocData["Location"]){
                        if(io === "outlet"){
                            let flag = false
                            if(DocData["Location"].toLowerCase().includes("outlet"))
                                flag = true
                            if(!flag && !DocData["Location"].toLowerCase().includes("discharge"))
                                return
                        } else if (DocData["Location"] && !DocData["Location"].toLowerCase().includes(io))
                            return
                    }  

                    data.push(DocData)
                })
            }
        });
    });

    await Promise.all(promises)

 */

module.exports.getInstrCategories1 = (req,res) => {
    // const adminuid = req.userData.uid
    const adminuid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"
    const categoryName = req.query.category
    const instrument = req.query.instrument
    const location = req.query.location
    const fluid = req.query.fluid
    const typeOfInstorWorkingPrinciple = req.query.tiowp
    const io = req.query.io

    // category query array can only contain one element
    if(categoryName !== undefined && Array.isArray(categoryName) && categoryName.length > 1){
        return res.status(400).json({
            message: "You can only query for one category"
        })
    }

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin not found"
            })
        }

        if(admin.get('accessLevel') !== 1){
            return res.status(401).json({
                message: "Only an admin can access this route"
            })
        }

        const plantID = admin.data().plantID

        const plant = await firestore.collection('plants').doc(plantID).get()

        if(!plant.exists){
            return res.status(400).json({
                message: "Plant not found"
            })
        }
        
        let data = []
        if(categoryName){
            const categoriesWithInstruments = await firestore.collection(`plants/${plantID}/processInstrCategory`).where("categoryName", "==", categoryName).get()

            if(categoriesWithInstruments.empty){
                return res.status(400).json({
                    message: "No instruments found for the given category"
                })
            }

            categoriesWithInstruments.forEach(category => {
                category.data().instrArray.forEach(instrument => {
                    data.push(instrument)
                })
            })

            let instrumentArray = []
            const promises = data.map(async (instrumentCode) => {
                // using the instrument code, get the instrument name from the realtime database
                let instrumentName = (await db.ref(`InstrumentCodes/${plantID}/${instrumentCode}`).once('value')).val()

                // replace all the whitespaces in the instrument name
                instrumentName = instrumentName.replace(/\s/g, '')

                // fetch all the instruments from the firestore collection
                const instruments = await firestore.collection(`plants/${plantID}/${instrumentName}`).get()

                instruments.forEach(instrument => {
                    instrumentArray.push(instrument.data())
                })
            })

            await Promise.all(promises)

            data = instrumentArray 
            
        } else if(instrument !== undefined || location !== undefined || fluid !== undefined || typeOfInstorWorkingPrinciple !== undefined || io !== undefined){
            data = await searchQueries(req.query, plantID)
        } else {
            const categoriesWithInstruments = await firestore.collection(`plants/${plantID}/processInstrCategory`).get()

            categoriesWithInstruments.forEach(category => {
                data.push(category.data().categoryName)
            })
        }

        return res.status(200).json({
            count: data.length,
            data: data
        })
    })
}