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
    "P&IDNo",
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

const numberFields = [
    "InstrumentRangeFrom",
    "InstrumentRangeTo",
    "Qty",
    "OCPress_Kg_cm2",
    "OCTemp_degC",
    "OCFlow_m3_hr"
]

module.exports.bulkAddInstruments = (req,res) => {
    const instrument_sheet = req.file
    const adminuid = req.userData.uid

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        const plantID = admin.data().plantID

        const plant = await firestore.collection('plants').doc(plantID).get()
       
        const workbook = new Excel.Workbook();
        await workbook.xlsx.readFile(instrument_sheet.path);
        fs.unlink(instrument_sheet.path, () => {})

        if(!plant.exists){
            return res.status(400).json({
                message: "Plant not found"
            })
        }

        const worksheet = workbook.getWorksheet(1);
        
        // get the first row
        const firstRow = worksheet.getRow(1).values;
        
        // check if the first row is equal to the header array element wise
        for (let i = 1; i < firstRow.length; i++) {
            const headerObtained = firstRow[i].trim()
            const headerRequired = header[i-1]

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
        
        // traverse through the rows of the sheet
        worksheet.eachRow(async (row, rowNumber) => {
            if(rowNumber === 1) return // skip the first row (header row)

            // rowData contains the entire data of an instrument
            const rowData = row.values;

            // data to store in firestore instrumentName collection
            let data = {}
            let instrumentName

            for (let j = 1; j < firstRow.length; j++) {
                // key contains the key against which the data is to be stored
                const key = firstRow[j].trim()

                // get the cell value of the current row
                let cellValue = rowData[j];
                
                // get the instrument name from the instrument code using realtime database
                if(j === 1){
                    let instrumentCode = extractInstrumentCode(cellValue).trim()
                    instrumentName = instrumentCodesData[instrumentCode].replace(/\s/g, '')
                }

                if(cellValue){
                    data[key] = cellValue
                }
            }
            // add the dateAdded field to the data object
            data["dateAdded"] = new Date().toLocaleString('en-US', options);

            // check if the instrument with the given tag number already exists in the instrumentName collection
            const instrument = await firestore.collection('plants').doc(plantID).collection(instrumentName).where("TagNo", '==', data["TagNo"]).get()

            // if no instrument with the given tag number exists, add the instrument to the instrumentName collection
            if(instrument.empty){
                await firestore.collection('plants').doc(plantID).collection(instrumentName).add(data)
            }
        })

        return res.status(200).json({
            message: 'Instrument(s) added successfully'
        })
    })
    .catch(err => {
        fs.unlink(instrument_sheet.path, (err) => {})
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.addInstrument = (req,res) => {
    const adminuid = req.userData.uid
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

    // check if all the required fields are present
    for (let i = 0; i < requiredFields.length; i++) {
        const field = requiredFields[i];
        if(req.body[field] === undefined || req.body[field] === null || req.body[field] === ""){
            return res.status(400).json({
                message: `${field} is required`
            })
        }
    }

    // check if any of the number fields if present is not a number
    for (let i = 0; i < numberFields.length; i++) {
        const field = numberFields[i];
        if(req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== "" && typeof req.body[field] !== 'number'){
            return res.status(400).json({
                message: `${field} must be a number`
            })
        }
    }

    // check if any of the string fields if present is not a string
    for (let i = 0; i < stringFields.length; i++) {
        const field = stringFields[i];
        if(req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== "" && typeof req.body[field] !== 'string'){
            return res.status(400).json({
                message: `${field} must be a string`
            })
        }
    }

    // isActive can only be Y or N 
    if(isActive !== 'Y' && isActive !== 'N'){
        return res.status(400).json({
            message: "isActive must be Y or N"
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
    })
}

module.exports.updateInstrument = (req,res) => {
    const adminuid = req.userData.uid
    const TagNo = req.body.TagNo
    const updates = req.body.updates
    
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

    // check if any of the number fields if present in the updates array is not a number
    for (let i = 0; i < numberFields.length; i++) {
        const field = numberFields[i];
        if(updates[field] !== undefined && updates[field] !== null && updates[field] !== "" && typeof updates[field] !== 'number'){
            return res.status(400).json({
                message: `${field} must be a number`
            })
        }
    }

    // check if any of the string fields if present in the updates array is not a string
    for (let i = 0; i < stringFields.length; i++) {
        const field = stringFields[i];
        if(updates[field] !== undefined && updates[field] !== null && updates[field] !== "" && typeof updates[field] !== 'string'){
            return res.status(400).json({
                message: `${field} must be a string`
            })
        }
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
        
        return res.status(200).json({
            message: 'Instrument updated successfully'
        })
    })
}

module.exports.deleteInstrument = (req,res) => {
    const adminuid = req.userData.uid
    const TagNo = req.params.TagNo

    // check if TagNo is present
    if(TagNo === undefined || TagNo === null || TagNo === ""){
        return res.status(400).json({
            message: "TagNo is required"
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
        
        return res.status(200).json({
            message: 'Instrument deleted successfully'
        })
    })
}