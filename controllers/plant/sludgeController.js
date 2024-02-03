const firebase = require('../../config/firebase')
const firestore = firebase.firestore()

const sludgeFields = [
    'frequency',
    'params',
    'totalSludgeAvl',
    'type',
    'unit'
]

const paramsFields = [
    'key',
    'type',
    'unit',
    'value'
]

const units = [
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

const formulaValidator = async (formula) => {
    
}

const paramsValidator = async (params) => {

    for (let i = 0; i < params.length; i++) {
        const element = params[i];

        Object.keys(element).forEach(key => {
            if(!paramsFields.includes(key)){
                return `${key} is not a valid field`
            }

            if(key === "type"){
                if(!types.includes(element[key])){
                    return `${element[key]} is an invalid type`
                }
                
                const typeValue = element[key]
                if(typeValue === 'Formula'){
                    // TODO: Validate formula
                }
        
                if(typeValue === 'Constant'){
                    if(isNaN(element.value)){
                        return `${element.value} is an invalid value`
                    }
                }
        
                if(typeValue === 'InstrumentId'){
                    // TODO: Validate instrumentId
                }
            }

            if(key === "unit"){
                if(!units.includes(element[key])){
                    return `${element[key]} is an invalid unit`
                }
            }

        });
        
    }

}

const processValidator = async (process) => {
    if(!process['processName']){
        return 'processName is required'
    }
    
    for (let i = 0; i < process['params'].length; i++) {
        const element = process['params'][i];
        
        const paramError = paramsValidator(element)
        if(paramError){
            return paramError
        }
    }

    return null
}

const sludgeValidator = async (sludge) => {
    let validationError = null
    Object.keys(sludge).forEach(key => {
        if(!sludgeFields.includes(key)){
            return `${key} is not a valid field`
        }

        if(key === "params"){
            const paramError = paramsValidator(sludge[key])
            if(paramError){
                validationError = paramError
                return
            }
        }


    });


}

module.exports.createSludge = (req,res) => {
    const adminUid = req.userData.uid
    const sludge = req.body.sludge
    const process = req.body.process

    const sludteError = sludgeValidator(sludge)

    if(sludteError){
        return res.status(400).json({
            message: sludteError
        })
    }

    if(process){
        const processError = processValidator(process)
        if(processError){
            return res.status(400).json({
                message: processError
            })
        }
    }

    firestore.collection('users').doc(adminUid).get()
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

        await firestore.collection(`plants/${plantID}/sludges`).add(sludge)

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