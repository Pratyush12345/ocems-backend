const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const db = firebase.firestore();

const chamberRequiredFields = [
    'chamberName',
    'chamberParams',
]

const allChamberFields = [
    'chamberName',
    'chamberParams',
    'inlet',
    'outlet',
    'subchamber',
    'sludge'
]

const arrayFields = [
    'inlet',
    'outlet',
    'subchamber'
]

const objectFields = [
    'chamberParams',
    'sludge'
]

const parameters = [
    'TSS',
    'BOD',
    'COD',
    'DAF'
]

const allTagNos = new Set()

const sludgeValidator = (sludge) => {
    const instruments = sludge.instruments
    const formula = sludge.formula

    if (!instruments) {
        return "sludge instruments is required"
    }

    if (!formula) {
        return "sludge formula is required"
    }

    if (!Array.isArray(instruments)) {
        return "sludge instruments must be an array"
    }

    if (typeof formula !== 'string') {
        return "sludge formula must be a string"
    }

    const idSet = new Set()
    const tagSet = new Set()
    for (let i = 0; i < instruments.length; i++) {
        const element = instruments[i];

        // the element should consists of TagNo and id field
        if (!element.TagNo) {
            return `sludge instruments[${i}].TagNo is required`
        }

        if (!element.id) {
            return `sludge instruments[${i}].id is required`
        }

        if (typeof element.TagNo !== 'string') {
            return `sludge instruments[${i}].TagNo must be a string`
        }

        if (typeof element.id !== 'string') {
            return `sludge instruments[${i}].id must be a string`
        }

        if (idSet.has(element.id)) {
            return `sludge instruments[${i}].id must be unique`
        } else {
            idSet.add(element.id)
        }

        if (tagSet.has(element.TagNo)) {
            return `sludge instruments[${i}].TagNo must be unique`
        } else {
            tagSet.add(element.TagNo)
        }

        if (!allTagNos.has(element.TagNo)) {
            allTagNos.add(element.TagNo)
        }

        const parameterError = parametersValidator(element['params'])
        if (parameterError) {
            return parameterError
        }
    }

    return null
}

const subchamberValidator = (subchamber) => {
    for (let i = 0; i < subchamber.length; i++) {
        const element = subchamber[i];

        const error = chamberValidator(element)
        if (error) {
            return error + ` in subchamber ${i}`
        }
    }

    return null
}

const ioValidator = (io) => {
    // the io array should consist of TagNo and should be unique
    const tagSet = new Set()
    for (let i = 0; i < io.length; i++) {
        const element = io[i];

        if (!element.name) {
            return `${i} name is required`
        }

        if (typeof element.name !== 'string') {
            return `${i} name must be a string`
        }

        const parameterError = parametersValidator(element['params'])
        if (parameterError) {
            return `${i} ${parameterError}`
        }
    }

    return null
}

const parametersValidator = (parameterObtained) => {
    // check if the chamberParams are present in the parameters array
    let validationError
    if (typeof parameterObtained !== 'object') {
        return "params must be an object"
    }

    Object.keys(parameterObtained).forEach((key) => {
        if (typeof parameterObtained[key] !== 'string') {
            validationError = `${key} must be a string`
            return
        }

        if (!allTagNos.has(parameterObtained[key])) {
            allTagNos.add(parameterObtained[key])
        }

    })
    return validationError ? validationError : null
}

const chamberValidator = (chamber) => {
    for (let i = 0; i < chamberRequiredFields.length; i++) {
        const element = chamberRequiredFields[i];
        const bodyElement = chamber[element]

        if (!bodyElement) {
            return `${element} is required`
        }
    }

    const parameterError = parametersValidator(chamber['chamberParams'])
    if (parameterError) {
        return parameterError
    }

    let validationError
    Object.keys(chamber).forEach((key) => {
        if (!allChamberFields.includes(key)) {
            validationError = `Unknown field ${key}`
            return
        }

        if (arrayFields.includes(key)) {
            if (!Array.isArray(chamber[key])) {
                validationError = `${key} must be an array`
                return
            }

            if (key === 'inlet' || key === 'outlet') {
                const ioError = ioValidator(chamber[key])
                if (ioError) {
                    validationError = `${key} ${ioError}`
                    return
                }
            }

        }

        if (objectFields.includes(key)) {
            if (typeof chamber[key] !== 'object') {
                validationError = `${key} must be an object`
                return
            }

            if (key === 'sludge') {
                const sludgeError = sludgeValidator(chamber[key])
                if (sludgeError) {
                    validationError = sludgeError
                    return
                }
            }
        }
    })

    if (validationError) {
        return validationError
    }

    return null
}

const calculateExpression = (expression, data) => {
    // Regular expression to match variable names like i1, i2, etc.
    const variableRegex = /\b(i\d+)\b/g;

    // Replace each variable in the expression with its corresponding value from the data
    const evaluatedExpression = expression.replace(variableRegex, (match, variable) => {
        return data[variable] || 0; 
    });

    try {
        return eval(evaluatedExpression);
    } catch (error) {
        console.error("Error evaluating expression:", error);
        return null; 
    }
}

const sludgeCaclulator = async (plantID, sludge) => {
    const instruments = sludge.instruments
    const formula = sludge.formula

    const data = {}
    for (let i = 0; i < instruments.length; i++) {
        const element = instruments[i];
        const TagNo = element.TagNo
        const id = element.id

        // go through the instrumentData collection, find the instrument where TagNo = TagNo
        const instrument = await firestore.collection(`plants/${plantID}/InstrumentData`).where('TagNo', '==', TagNo).get()

        data[id] = instrument.empty ? 0 : instrument.docs[0].data().latestData.value
    }

    const value = calculateExpression(formula, data)
    return value
}

module.exports.getChamber = async (req, res) => {
    const plantID = req.userData.plantID
    const chamberID = req.query.chamber

    try {
        let query = firestore.collection('plants').doc(plantID).collection('Chamber')
        const data = []
        if (chamberID) {
            query = query.doc(chamberID)

            const chamber = await query.get()
            if (!chamber.exists) {
                return res.status(404).send({
                    message: "Chamber does not exist"
                })
            }

            data.push({
                id: chamber.id,
                data: chamber.data()
            })

        } else {
            const chambers = await query.get()

            chambers.forEach(chamber => {
                data.push({
                    id: chamber.id,
                    data: chamber.data()
                })
            })
        }

        for (let i = 0; i < data.length; i++) {
            const chamber = data[i].data;

            if (chamber.sludge) {
                const sludgeValue = await sludgeCaclulator(plantID, chamber.sludge)
                data[i].data.sludge.value = sludgeValue
            }

            if(chamber.subchamber) {
                const subchambers = chamber.subchamber

                for (let j = 0; j < subchambers.length; j++) {
                    const subchamber = subchambers[j];
        
                    if (subchamber.sludge) {
                        const sludgeValue = await sludgeCaclulator(plantID, subchamber.sludge);
                        data[i].data.subchamber[j].sludge.value = sludgeValue;
                    }
                }
            }

        }

        // sort the chambers based on the position
        data.sort((a, b) => a.data.position - b.data.position)
        
        return res.status(200).json({
            chamber: data
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.createChamber = async (req, res) => {
    const plantID = req.userData.plantID
    const subchambers = req.body.subchamber

    const chamberError = chamberValidator(req.body)
    if (chamberError) {
        return res.status(400).send({
            message: chamberError + " in chamber"
        })
    }
    if (subchambers) {
        const subchamberError = subchamberValidator(subchambers)
        if (subchamberError) {
            return res.status(400).send({
                message: subchamberError
            })
        }
    }

    const allTagNosLocal = new Set()

    try {
        // fetch the local instruments from data/isntruments/{plantID}.json
        const allInstruments = require('../../data/instruments/' + plantID + '.json').data

        // check if the TagNo are unique
        for (let i = 0; i < allInstruments.length; i++) {
            const instrument = allInstruments[i];

            if (!allTagNosLocal.has(instrument.TagNo))
                allTagNosLocal.add(instrument.TagNo)
        }

        // check if the TagNo are unique
        let tagError
        allTagNos.forEach((tagNo) => {
            if (!allTagNosLocal.has(tagNo)) {
                tagError = true
                return res.status(404).send({
                    message: `Instrument with TagNo ${tagNo} not found`
                })
            }
        })

        if (tagError) return

        // check if the chamberName exists in the chamber collection
        const chamberName = req.body.chamberName
        const chamber = await firestore.collection('plants').doc(plantID).collection('Chamber').where('chamberName', '==', chamberName).get()

        if (!chamber.empty) {
            return res.status(400).send({
                message: "Chamber with same name already exists"
            })
        }

        // get the chamber lengthj
        const chamberLength = (await firestore.collection(`plants/${plantID}/Chamber`).count().get()).data().count
        req.body["position"] = chamberLength + 1

        await firestore.collection('plants').doc(plantID).collection('Chamber').add(req.body)

        return res.status(200).json({
            message: "Chamber added successfully"
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.addIO = async (req,res) => {
    const plantID = req.userData.plantID
    const chamberID = req.query.chamberid
    let type = req.query.type
    let name = req.body.name
    let params = req.body.params

    if(!chamberID){
        return res.status(400).json({
            message: 'ChamberID is required'
        })
    }

    if(!type){
        return res.status(400).json({
            message: "type is required"
        })
    }

    if(!name){
        return res.status(400).json({
            message: "name is required"
        })
    }

    if(params){
        if(typeof params !== 'object'){
            return res.status(400).json({
                message: 'params should be an object'
            })
        }
    }

    type = parseInt(type)

    try {
        const chamber = await firestore.collection('plants').doc(plantID).collection('Chamber').doc(chamberID).get()

        if(!chamber.exists){
            return res.status(404).json({
                message: "Chamber Not Found"
            })
        }

        const chamberData = chamber.data()

        if(type === 1){
            const inlet = chamberData.inlet
            inlet.push({
                name: name,
                params: params
            })

            await chamber.ref.update({
                inlet: inlet
            })
        } else if (type === 2){
            const outlet = chamberData.outlet
            outlet.push({
                name: name,
                params: params
            })

            await chamber.ref.update({
                outlet: outlet
            })
        }

        return res.status(200).json({
            message: `${type === 1 ? "Inlet" : "Outlet"} added successfully`
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }
}

module.exports.updateChamber = async (req,res) => {
    const plantID = req.userData.plantID
    const chamberID = req.query.chamber
    const subchambers = req.body.subchamber
    
    if(req.body.position) {
        return res.status(400).send({
            message: "position cannot be updated"
        })
    }

    const chamberError = chamberValidator(req.body)
    if (chamberError) {
        return res.status(400).send({
            message: chamberError + " in chamber"
        })
    }

    if (subchambers) {
        const subchamberError = subchamberValidator(subchambers)
        if (subchamberError) {
            return res.status(400).send({
                message: subchamberError
            })
        }
    }


    const allTagNosLocal = new Set()

    try {
        // fetch the local instruments from data/isntruments/{plantID}.json
        const allInstruments = require('../../data/instruments/' + plantID + '.json').data

        // check if the TagNo are unique
        for (let i = 0; i < allInstruments.length; i++) {
            const instrument = allInstruments[i];

            if (!allTagNosLocal.has(instrument.TagNo))
                allTagNosLocal.add(instrument.TagNo)
        }

        // check if the TagNo are unique
        let tagError
        allTagNos.forEach((tagNo) => {
            if (!allTagNosLocal.has(tagNo)) {
                tagError = true
                return res.status(404).send({
                    message: `Instrument with TagNo ${tagNo} not found`
                })
            }
        })

        if (tagError) return

        const chamberGet = await firestore.collection(`plants/${plantID}/Chamber`).doc(chamberID).get()

        if(!chamberGet.exists){
            return res.status(404).json({
                message: "Chamber Not Found"
            })
        }

        await chamberGet.ref.update(req.body)

        return res.status(200).json({
            message: "Chamber updated successfully"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

const updateParamsHelper = (oldObject, indexToUpdate, params, operation) => {
    const newObject = {}
    if(operation === 'add'){
        oldObject[params.key] = params.value
        return oldObject
    }

    Object.keys(oldObject).forEach((key, index) => {
        if(index === indexToUpdate){
            if(operation === 'update')
                newObject[params.key] = params.value
        } else {
            newObject[key] = oldObject[key]
        }
    })
    return newObject
}

module.exports.updateParams = async (req,res) => {
    const plantID = req.userData.plantID
    const chamberID = req.query.chamberid
    let type = req.query.type
    let indexToUpdate = req.query.index
    const params = req.body.params
    const operation = req.query.operation
    const name = req.body.name

    if(!chamberID){
        return res.status(400).json({
            message: "chamberID is required"
        })
    }

    if(!type){
        return res.status(400).json({
            message: "type is required"
        })
    }

    if(!operation){
        return res.status(400).json({
            message: "operation is required"
        })
    } else {
        if(operation !== 'add' && operation !== 'update' && operation !== 'delete' && operation !== 'name'){
            return res.status(400).json({
                message: "Invalid operation provided"
            })
        }

        if(operation !== 'add' && operation !== 'name'){
            if(!indexToUpdate){
                return res.status(400).json({
                    message: "index is required"
                })
            }
        }

        if(operation !== 'name'){
            if(params){
                if(!params.key){
                    return res.status(400).json({
                        message: "params.key is required"
                    })
                }
        
                if(!params.value){
                    return res.status(400).json({
                        message: "params.value is required"
                    })
                }
            } else {
                return res.status(400).json({
                    message: "params is required"
                })
            }
        } else {
            if(!name){
                return res.status(400).json({
                    message: "name is required"
                })
            }
        }
    }

    type = parseInt(type)
    indexToUpdate = parseInt(indexToUpdate)

    try {
        // get the chamber with the given chamberID
        const chamberGet = await firestore.collection(`plants/${plantID}/Chamber`).doc(chamberID).get()

        if(!chamberGet.exists){
            return res.status(404).json({
                message: "Chamber Not Found"
            })
        }

        const chamber = chamberGet.data()

        /*
            Type => 
                0: Chamber
                1: Inlet
                2: Outlet
        */
        if(type === 0){ 
            if(operation === 'name'){
                await chamberGet.ref.update({
                    chamberName: name
                })
            } else {
                await chamberGet.ref.update({
                    chamberParams: updateParamsHelper(chamber.chamberParams, indexToUpdate, params, operation)
                })
            }

        } else if (type === 1){
            const inlet = chamber.inlet
            let inletIndex = req.query.inletIndex

            if(!inletIndex){
                return res.status(400).json({
                    message: "inletIndex is required"
                })
            }

            inletIndex = parseInt(inletIndex)
            const newInlet = []

            for (let i = 0; i < inlet.length; i++) {
                const element = inlet[i];
                if(i === inletIndex){
                    if(operation === 'name'){
                        newInlet.push({
                            name: name,
                            params: element.params
                        })
                    } else {
                        newInlet.push({
                            name: element.name,
                            params: updateParamsHelper(element.params, indexToUpdate, params, operation)
                        })
                    }

                } else {
                    newInlet.push(element)
                }
            }

            await chamberGet.ref.update({
                inlet: newInlet
            })
        } else if (type === 2){
            const outlet = chamber.outlet
            let outletIndex = req.query.outletIndex

            if(!outletIndex){
                return res.status(400).json({
                    message: "outletIndex is required"
                })
            }

            outletIndex = parseInt(outletIndex)
            const newOutlet = []

            for (let i = 0; i < outlet.length; i++) {
                const element = outlet[i];
                if(i === outletIndex){
                    if(operation === 'name'){
                        newOutlet.push({
                            name: name,
                            params: element.params
                        })
                    } else {
                        newOutlet.push({
                            name: element.name,
                            params: updateParamsHelper(element.params, indexToUpdate, params, operation)
                        })
                    }

                } else {
                    newOutlet.push(element)
                }
            }

            await chamberGet.ref.update({
                outlet: newOutlet
            })
        } else {
            return res.status(400).json({
                message: "Invalid type provided"
            })
        }

        return res.status(200).json({
            message: `${type === 0 ? "Chamber" : type === 1 ? "Inlet" : "Outlet" } updated successfully`
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }
}

module.exports.swapChamberPosition = async (req,res) => {
    const plantID = req.userData.plantID
    const chamberID = req.body.chamberID
    const newPosition = req.body.newPosition

    try {
        // get the chamber with the given chamberID
        const chamberGet = await firestore.collection(`plants/${plantID}/Chamber`).doc(chamberID).get()

        if(!chamberGet.exists){
            return res.status(404).json({
                message: "Chamber Not Found"
            })
        }

        const chamber = chamberGet.data()

        const chamberLength = (await firestore.collection(`plants/${plantID}/Chamber`).count().get()).data().count

        if(newPosition > chamberLength || newPosition < 1){
            return res.status(400).json({
                message: "Invalid Position provided"
            })
        }

        // get the chamber present at the newPosition
        const chamberAtNewPosition = (await firestore.collection(`plants/${plantID}/Chamber`).where('position', '==', newPosition).get()).docs[0]

        // assign the chamber's current position to the chamber at newPosition
        await chamberAtNewPosition.ref.update({
            position: chamber.position
        })

        // assign the newPosition to the chamber
        await chamberGet.ref.update({
            position: newPosition
        })

        return res.status(200).json({
            message: "Chamber updated successfully"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.deleteChamber = async (req, res) => {
    const plantID = req.userData.plantID
    const chamberID = req.params.chamberID
    let type = req.query.type
    let inletIndex = req.query.inletIndex
    let outletIndex = req.query.outletIndex
    console.log(req.query);

    if(!type){
        return res.status(400).json({
            message: "type is required"
        })
    }

    type = parseInt(type)
    
    if(type === 0){
        if(inletIndex || outletIndex){
            return res.status(400).json({
                message: "inletIndex and outletIndex are not required"
            })
        }

    } else if (type === 1){
        if(!inletIndex){
            return res.status(400).json({
                message: "inletIndex is required"
            })
        }
    } else if (type === 2){
        if(!outletIndex){
            return res.status(400).json({
                message: "outletIndex is required"
            })
        }
    } else {
        return res.status(400).json({
            message: "Invalid type provided"
        })
    }

    inletIndex = parseInt(inletIndex)
    outletIndex = parseInt(outletIndex)

    try {
        // check if the chamberID exists in the chamber collection
        const chamber = await firestore.collection('plants').doc(plantID).collection('Chamber').doc(chamberID).get()

        if (!chamber.exists) {
            return res.status(400).send({
                message: "Chamber does not exist"
            })
        }

        if(type === 0){
            await firestore.collection('plants').doc(plantID).collection('Chamber').doc(chamberID).delete()    

            const allChambers = await firestore.collection('plants').doc(plantID).collection('Chamber').orderBy('position', 'asc').get()

            // go through all the chambers, and if the difference between consecutive chambers position is > 1, then from there onwards, decrease the position by 1 for all the chambers til the end
            let prevPosition = 0
            for (let i = 0; i < allChambers.docs.length; i++) {
                const chamber = allChambers.docs[i];
    
                const position = chamber.data().position
    
                if (position - prevPosition > 1) {
                    // decrease the position by 1 for all the chambers til the end
                    for (let j = i; j < allChambers.docs.length; j++) {
                        const chamber = allChambers.docs[j];
    
                        await chamber.ref.update({
                            position: chamber.data().position - 1
                        })
                    }
                    break
                }
    
                prevPosition = position
            }

        } else if (type === 1){
            const inlet = chamber.data().inlet
            inlet.splice(inletIndex, 1)

            await chamber.ref.update({
                inlet: inlet
            })

        } else if (type === 2){
            const outlet = chamber.data().outlet
            outlet.splice(outletIndex, 1)

            await chamber.ref.update({
                outlet: outlet
            })
        }

        return res.status(200).json({
            message: `${type === 0 ? "Chamber" : type === 1 ? "Inlet" : "Outlet" } deleted successfully`
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}