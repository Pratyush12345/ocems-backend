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

        if (!element.TagNo) {
            return `${i} TagNo is required`
        }

        if (typeof element.TagNo !== 'string') {
            return `${i} TagNo must be a string`
        }

        if (tagSet.has(element.TagNo)) {
            return `${i} TagNo must be unique`
        } else {
            tagSet.add(element.TagNo)
        }

        if (!allTagNos.has(element.TagNo)) {
            allTagNos.add(element.TagNo)
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

    for (let i = 0; i < parameters.length; i++) {
        const element = parameters[i];
        if (!parameterObtained[element]) {
            return `params ${element} is required`
        }
    }

    Object.keys(parameterObtained).forEach((key) => {
        if (!parameters.includes(key)) {
            validationError = `Invalid Parameter ${key}`
            return
        }

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
    // const adminuid = req.userData.uid
    const adminuid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"
    const chamberID = req.query.chamber

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if (!admin.exists) {
            return res.status(400).send({
                message: "admin does not exist"
            })
        }

        if (admin.get('accessLevel') !== 1) {
            return res.status(400).send({
                message: "Only admin can get chamber"
            })
        }

        const plantID = admin.get('plantID')

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
                        console.log(data[i].data.subchamber[j].sludge);
                        data[i].data.subchamber[j].sludge.value = sludgeValue;
                    }
                }
            }

        }

        return res.status(200).json({
            chamber: data
        })

    })
    .catch(error => {
        return res.status(500).send({
            message: error.message
        })
    })
}

module.exports.createChamber = async (req, res) => {
    // const adminuid = req.userData.uid
    const adminuid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"
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

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if (!admin.exists) {
            return res.status(400).send({
                message: "admin does not exist"
            })
        }

        if (admin.get('accessLevel') !== 1) {
            return res.status(400).send({
                message: "Only admin can create chamber"
            })
        }

        const plantID = admin.get('plantID')

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

    })
    .catch(error => {
        return res.status(500).send({
            message: error.message
        })
    })

}

module.exports.updateChamber = async (req,res) => {
    // const adminuid = req.userData.uid
    const adminuid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"
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

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if (!admin.exists) {
            return res.status(400).send({
                message: "admin does not exist"
            })
        }

        if (admin.get('accessLevel') !== 1) {
            return res.status(400).send({
                message: "Only admin can update chamber"
            })
        }

        const plantID = admin.get('plantID')

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

    })
    .catch(error => {
        return res.status(500).send({
            message: error.message
        })
    })

}

module.exports.swapChamberPosition = async (req,res) => {
    // const adminuid = req.userData.uid
    const adminuid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"
    const chamberID = req.body.chamberID
    const newPosition = req.body.newPosition

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if (!admin.exists) {
            return res.status(400).send({
                message: "admin does not exist"
            })
        }

        if (admin.get('accessLevel') !== 1) {
            return res.status(400).send({
                message: "Only admin can update chamber"
            })
        }

        const plantID = admin.get('plantID')

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

    })
    .catch(error => {
        return res.status(500).send({
            message: error.message
        })
    })
}

module.exports.deleteChamber = async (req, res) => {
    // const adminuid = req.userData.uid
    const adminuid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"
    const chamberID = req.params.chamberID

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if (!admin.exists) {
            return res.status(400).send({
                message: "admin does not exist"
            })
        }

        if (admin.get('accessLevel') !== 1) {
            return res.status(400).send({
                message: "Only admin can delete chamber"
            })
        }

        const plantID = admin.get('plantID')

        // check if the chamberID exists in the chamber collection
        const chamber = await firestore.collection('plants').doc(plantID).collection('Chamber').doc(chamberID).get()

        if (!chamber.exists) {
            return res.status(400).send({
                message: "Chamber does not exist"
            })
        }

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

        return res.status(200).json({
            message: "Chamber deleted successfully"
        })

    })
    .catch(error => {
        return res.status(500).send({
            message: error.message
        })
    })

}