const firebase = require('../../config/firebase')
const firestore = firebase.firestore()

const sludgeFields = [
    'frequency',
    'params',
    'totalSludgeAvl',
    'type',
    'unit'
]

const sludgeFieldsTypes = {
    frequency: 'string',
    totalSludgeAvl: 'number',
    type: 'string',
    unit: 'string'
}

const paramsFields = [
    'key',
    'type',
    'unit',
    'value'
]

const paramsFieldsTypes = {
    key: 'string',
    type: 'string',
    unit: 'string'
}

const units = [
    '%',
    "m3/d",
    "mg/l",
    "%",
    "kg/d",
    "deg.C",
    "gVSS/gbCOD",
    "g/g.d",
    "kg VSS/d"
]

const types = [
    'Formula',
    'Constant',
    'InstrumentId'
]

const values = {
    Constant: 'number',
    Formula: 'string',
    InstrumentId: 'string'
}

const instrumentValidator = (plantID, instrumentArray) => {
    const localInstruments = require(`../../data/instruments/${plantID}.json`).data

    let validationError = null
    instrumentArray.forEach(instrumentId => {
        const result = localInstruments.find(instrument => {return instrument.TagNo === instrumentId})
        if(!result){
            validationError = `${instrumentId} is not a valid instrument`
            return
        }
    })
    return validationError
}

const forumlaValidator = (formula) => {
    // TASK: Validate the formula
    const allVariables = extractAllVariables(formula);
    let data = {}
    // assign random values to all the variables between 10 and 100 and store in the data object
    for (let i = 0; i < allVariables.length; i++) {
        const element = allVariables[i];
        data[element] = Math.floor(Math.random() * 100) + 10
    }

    const value = calculateFormulaValue(formula, data)
    return typeof value === 'number' ? null : `Invalid formula ${formula}`
}

const paramsValidator = (params, instrumentArray) => {
    // checking if all the fields are valid before such that we can perform validations later on
    let validationError = null

    for (let i = 0; i < params.length; i++) {
        const element = params[i];

        Object.keys(element).forEach(key => {
            if(!paramsFields.includes(key)){
                validationError = `${key} is not a valid field`
                return
            }
        })
    }

    if(validationError) return validationError
    
    for (let i = 0; i < params.length; i++) {
        const element = params[i];
        Object.keys(element).forEach(key => {   
            if(key !== "value" && (typeof element[key] !== paramsFieldsTypes[key])){
                validationError = `${key} should be a ${paramsFieldsTypes[key]}`
                return
            }
            
            if(key === "type"){
                if(!types.includes(element['type'])){
                    validationError = `${element[key]} is an invalid type`
                    return
                }
            }
            
            if(key === "value"){
                const type = element['type']
                const typeValue = element['value']

                if(!types.includes(type)){
                    validationError = `${type} is an invalid type`
                    return
                }

                if(typeof typeValue !== values[type]){
                    validationError = `${type} should be a ${values[type]}` 
                    return
                }
                
                if(type === 'Formula'){
                    const formulaError = forumlaValidator(typeValue)
                    if(formulaError){
                        validationError = formulaError
                        return
                    }
                } else if(type === 'InstrumentId'){
                    if(!instrumentArray.includes(typeValue))
                        instrumentArray.push(typeValue)
                }
            }

            if(key === "unit"){
                if(!units.includes(element[key])){
                    validationError = `${element[key]} is an invalid unit`
                    return
                }
            }
        });
    }
    
    return validationError
}

const processFieldsValidator = (process, update) => {
    let validationError = null

    const processFields = [
        'processName',
        'params'
    ]

    for (let i = 0; i < process.length; i++) {
        const element = process[i];
        if(update) processFields.push('processId')

        for (let j = 0; j < processFields.length; j++) {
            const field = processFields[j];

            if(!element[field]){
                return `${field} is required`
            }
        }

        Object.keys(element).forEach(key => {
            if(!processFields.includes(key)){
                validationError = `${key} is not a valid field`
                return
            }
        })
    }

    return validationError
}

const processValidator = (processArray, instrumentArray) => {
    if(!Array.isArray(processArray)){
        return 'process should be an array'
    }

    for (let i = 0; i < processArray.length; i++) {
        const process = processArray[i];

        const paramError = paramsValidator(process['params'], instrumentArray)
        if(paramError){
            return paramError
        }
    }
    return null
}

const sludgeValidator = (sludge, instrumentArray) => {
    let validationError = null

    for (let i = 0; i < sludgeFields.length; i++) {
        const element = sludgeFields[i];

        if(!sludge[element]){
            return `${element} is required for sludge`
        }
    }
    
    Object.keys(sludge).forEach(key => {
        if(!sludgeFields.includes(key)){
            validationError = `${key} is not a valid field`
            return
        }

        if(key !== 'params' && (typeof sludge[key] !== sludgeFieldsTypes[key])){
            validationError = `${key} should be a ${sludgeFieldsTypes[key]}`
            return
        }

        if(key === "params"){
            if(!Array.isArray(sludge[key])){
                validationError = `params should be an array`
                return
            }

            const paramError = paramsValidator(sludge['params'], instrumentArray)
            if(paramError){
                validationError = paramError
                return
            }
        }

        // TODO: Handle frequency and unit together

    });

    return validationError
}

const sludgeAndProcessValidator = (sludge, process, instrumentArray, update) => {
    const sludgeError = sludgeValidator(sludge, instrumentArray)

    if(sludgeError){
        return sludgeError
    }
    
    if(process){
        const processFieldsError = processFieldsValidator(process, update)

        if(processFieldsError){
            return processFieldsError
        }

        const processError = processValidator(process, instrumentArray)
        if(processError){
            return processError
        }
    }
    return null
}

module.exports.createSludge = (req,res) => {
    // const adminUid = req.userData.uid
    const adminUid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"
    const sludge = req.body.sludge
    const process = req.body.process

    let instrumentArray = []

    const sludgeAndProcessError = sludgeAndProcessValidator(sludge, process, instrumentArray)

    if(sludgeAndProcessError){
        return res.status(400).json({
            message: sludgeAndProcessError
        })
    }

    firestore.collection('users').doc(adminUid).get()
    .then(async admin => {
        if (!admin.exists) {
            return res.status(400).send({
                message: "Admin doesn't exist"
            })
        }

        if (admin.get('accessLevel') !== 1) {
            return res.status(400).send({
                message: "Only admin can access this route"
            })
        }

        const plantID = admin.get('plantID')

        if(instrumentArray.length > 0){
            const instrumentError = instrumentValidator(plantID, instrumentArray)
            if(instrumentError){
                return res.status(404).json({
                    message: instrumentError
                })
            }
        }

        const sludgeAdded = await firestore.collection(`plants/${plantID}/sludge`).add(sludge)

        for (let i = 0; i < process.length; i++) {
            const element = process[i];

            await firestore.collection(`plants/${plantID}/sludge`).doc(sludgeAdded.id).collection('process').add(element)
        }
        return res.status(200).json({
            message: "Sludge created successfully"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

const getLatestInstrumentData = async (plantID, instrumentId) => {
    try {
        const instrumentData = await firestore.collection(`plants/${plantID}/InstrumentData`).where('TagNo', '==', instrumentId).get()
        return instrumentData.docs[0].data().latestData.value
    } catch (error) {
        console.log(error);
    }
}

const extractAllVariables = (formula) => {
    const pattern = /([a-zA-Z0-9]+\$[0-9]+|\$[0-9]+)/g;
    const matches = formula.matchAll(pattern);
    return [...matches].map(match => match[0]);
}

const isPatternMatching = (formula) => {
    // TASK: Return true if the formula is of the form l1rrprDJWe0Qfq60KIig$0 (eg)
    const pattern = /^[a-zA-Z0-9]+\$[0-9]+$/;
    return pattern.test(formula);
}

const getFormulaPartValue = (interDependentVariable, processArray) => {
    // TASK: Return the value of the interDependentVariable
    // input is l1rrprDJWe0Qfq60KIig$0 for eg and the output should be the value of the variable
    const pattern = /([a-zA-Z0-9]+)\$([0-9]+)/;
    const match = interDependentVariable.match(pattern);
    const process = processArray.find(process => process.id === match[1])
    return process.data.params[Number(match[2])].data
}

const calculateFormulaValue = (formula, data) => {
    // TASK: Replace all variables with their values, and then evaluate the formula
    try {
        const varRegex = /\$\d+|[a-zA-Z][\w$]*/g;
        const replacedFormula = formula.replace(varRegex, match => {
            return data[match];
        });
        return eval(replacedFormula);
    } catch (error) {
        return {
            error: true
        }
    }
}

const processSludgeCalculatorHelper1 = async (plantID, process, processArray, index, sludge) => {
    const processType = process['type']
    const processValue = process['value']

    if(processType === 'InstrumentId'){
        // TASK: Return the value of the instrument
        return await getLatestInstrumentData(plantID, processValue)
    } else if (processType === 'Formula'){
        // TASK: Return the value of the formula after all variables substitution
        const allVariables = extractAllVariables(processValue)
        let data = {}

        for (let i = 0; i < allVariables.length; i++) {
            const element = allVariables[i];
            /**
             * If pattern is matching, then the element is of the form l1rrprDJWe0Qfq60KIig$0 (eg) and we need to get the value of the interDependentVariable using getFormulaPartValue
             * else element is of the form $0 (eg) and we need to get the value of the variable from the processArray or directly from sludge (if present)
             *      if sludge is present
             *          get value directly from sludge object
             *      else
             *          get value from processArray
             */
            data[element] = isPatternMatching(element) ?
                getFormulaPartValue(element, processArray) :
                (sludge ? 
                    sludge.params[element.split('$')[1]].data : 
                    processArray[index].data.params[element.split('$')[1]].data)
        }

        return calculateFormulaValue(processValue, data)
    } else if (processType === 'Constant'){
        // TASK: Return the value of the constant
        return processValue
    }
}

const processSludgeCalculator = async (plantID, processArray) => {
    for (let i = 0; i < processArray.length; i++) {
        const params = processArray[i].data.params
        for (let j = 0; j < params.length; j++) {
            // pass a process param object to processSludgeCalculatorHelper1 then the value obtained should be assigned to the data key of the process object
            processArray[i].data.params[j].data = await processSludgeCalculatorHelper1(plantID, params[j], processArray, i) 
        }
    }
}

const sludgeCalculator = async (plantID, sludge, processArray) => {
    // TASK: Calculate the value of all the process variables first such that all the variables are available for the sludge calculation
    await processSludgeCalculator(plantID, processArray)

    const param = sludge.params
    for (let i = 0; i < param.length; i++) {
        sludge.params[i].data = await processSludgeCalculatorHelper1(plantID, param[i], processArray, i, sludge)
    }
}

module.exports.getSludge = (req,res) => {
    // const adminUid = req.userData.uid
    const adminUid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"
    const sludgeId = req.query.id

    if(!sludgeId){
        return res.status(400).json({
            message: "Sludge id is required"
        })
    }

    firestore.collection('users').doc(adminUid).get()
    .then(async admin => {
        if (!admin.exists) {
            return res.status(400).send({
                message: "Admin doesn't exist"
            })
        }

        if (admin.get('accessLevel') !== 1) {
            return res.status(400).send({
                message: "Only admin can access this route"
            })
        }

        const plantID = admin.get('plantID')

        const sludge = await firestore.collection(`plants/${plantID}/sludge`).doc(sludgeId).get()
        const process = await sludge.ref.collection('process').get()

        let processArray = []
        process.forEach(doc => {
            processArray.push({
                id: doc.id,
                data: doc.data()
            })
        });
        const sludgeData = sludge.data()

        await sludgeCalculator(plantID, sludgeData, processArray)

        return res.status(200).json({
            sludge: sludgeData,
            process: processArray
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.updateSludge = (req,res) => {
    // const adminUid = req.userData.uid
    const adminUid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"
    const sludgeId = req.query.id
    const sludge = req.body.sludge
    const process = req.body.process

    let instrumentArray = []

    const sludgeAndProcessError = sludgeAndProcessValidator(sludge, process, instrumentArray, true)

    if(sludgeAndProcessError){
        return res.status(400).json({
            message: sludgeAndProcessError
        })
    }

    firestore.collection('users').doc(adminUid).get()
    .then(async admin => {
        if (!admin.exists) {
            return res.status(400).send({
                message: "Admin doesn't exist"
            })
        }

        if (admin.get('accessLevel') !== 1) {
            return res.status(400).send({
                message: "Only admin can access this route"
            })
        }

        const plantID = admin.get('plantID')

        if(instrumentArray.length > 0){
            const instrumentError = instrumentValidator(plantID, instrumentArray)
            if(instrumentError){
                return res.status(404).json({
                    message: instrumentError
                })
            }
        }
        const sludgeRef = firestore.collection(`plants/${plantID}/sludge`).doc(sludgeId)

        for (let i = 0; i < process.length; i++) {
            const element = process[i];
            
            const processRef = await sludgeRef.collection('process').doc(element.processId).get()
            if(!processRef.exists){
                return res.status(404).json({
                    message: `Process with id ${element.processId} doesn't exist`
                })
            }
        }

        await sludgeRef.update(sludge)

        for (let i = 0; i < process.length; i++) {
            const element = process[i];
            const processRef = sludgeRef.collection('process').doc(element.processId)
            delete element.processId
            await processRef.update(element)
        }

        return res.status(200).json({
            message: "Sludge updated successfully"
        })
    })
}

module.exports.deleteSludge = (req,res) => {
    // const adminUid = req.userData.uid
    const adminUid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"
    const sludgeId = req.query.id

    if(!sludgeId){
        return res.status(400).json({
            message: "Sludge id is required"
        })
    }

    firestore.collection('users').doc(adminUid).get()
    .then(async admin => {
        if (!admin.exists) {
            return res.status(400).send({
                message: "Admin doesn't exist"
            })
        }

        if (admin.get('accessLevel') !== 1) {
            return res.status(400).send({
                message: "Only admin can access this route"
            })
        }

        const plantID = admin.get('plantID')

        const sludgeRef = firestore.collection(`plants/${plantID}/sludge`).doc(sludgeId)
        const process = await sludgeRef.collection('process').get()
        if(process.empty){
            return res.status(404).json({
                message: "Sludge doesn't exist"
            })
        }
        process.forEach(async doc => {
            await sludgeRef.collection('process').doc(doc.id).delete()
        });

        await sludgeRef.delete()

        return res.status(200).json({
            message: "Sludge deleted successfully"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}