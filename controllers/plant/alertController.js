const firebase = require('../../config/firebase')
const firestore = firebase.firestore()

function extractInstrumentCode(inputString) {
    const match = inputString.match(/^[A-Za-z\s]+/);
    return match ? match[0] : null;
}

module.exports.getAlerts = (req,res) => {
    const adminuid = req.userData.uid
    const location = req.query.location

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        if(admin.get('accessLevel')!==1){
            return res.status(401).json({
                message: "Only admin can perform alert operations"
            })
        }

        const plantID = admin.get('plantID')

        const alerts = await firestore.collection(`plants/${plantID}/InstrumentAlerts`).orderBy('timestamp', 'desc').get()
        
        const alertList = []

        alerts.forEach(alert => {
            alertList.push({
                id: alert.id,
                data: alert.data()
            })
        })

        const instruments = require(`../../data/instruments/${plantID}.json`).data
        const instrumentCategories = await firestore.collection(`plants/${plantID}/processInstrCategory`).get()

        const alertsToReturn = []

        alertList.forEach(alertInstrument => {
            const alertTagNo = alertInstrument.data.TagNo
            const instrumentCode = extractInstrumentCode(alertTagNo)
            const timestamp = alertInstrument.data.timestamp
            let flag = true

            instruments.forEach(instrument => {
                const instrumentTagNo = instrument.TagNo

                if(alertTagNo === instrumentTagNo){
                    if(location && !instrument.Location.toLowerCase().includes(location.toLowerCase())){
                        flag = false
                        return
                    }
                    alertInstrument.data['location'] = instrument.Location
                    
                    if(instrument.TypeOfInstorWorkingPrinciple) {
                        alertInstrument.data['type'] = instrument.TypeOfInstorWorkingPrinciple
                    }

                    instrumentCategories.forEach(category => {
                        const filterName = category.get('categoryName')
                        const filterItems = category.get('instrArray')

                        if(filterItems.includes(instrumentCode)){
                            alertInstrument.data['category'] = filterName
                            return
                        }
                    })
                    
                    alertInstrument.data['timestamp'] = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1e6).toLocaleString()
                }
            })

            if(flag){
                alertsToReturn.push(alertInstrument)
            }
        })

        return res.status(200).json({
            count: alertsToReturn.length,
            data: alertsToReturn
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.alertsCount = (req,res) => {
    const adminuid = req.userData.uid

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        if(admin.get('accessLevel')!==1){
            return res.status(401).json({
                message: "Only admin can perform alert operations"
            })
        }

        const plantID = admin.get('plantID')

        const count = (await firestore.collection(`plants/${plantID}/InstrumentAlerts`).count().get()).data().count

        return res.status(200).json({
            count: count
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

/**
 * 1. Get all alerts from InstrumentAlerts collection
 * 2. Get all local instruments
 * 3. Populate the instruments with the alerts
 * 
 //* Possible combinations
 * 1. Return all alerts
 * 2. Return alerts based on the location
 */

module.exports.test = async (req,res) => {
    try {
        const testdata = await firestore.collection("plants/P0/InstrumentAlerts").doc('8cqHBJaqsosiBNWOHbHK').get()

        const firebaseTimestamp = testdata.data().timestamp
        const dateObject = new Date(firebaseTimestamp.seconds * 1000 + firebaseTimestamp.nanoseconds / 1e6);
        console.log(dateObject.toLocaleString());
        return res.status(200).json({
            message: testdata.data()
        })
    } catch (error) {
        return res.status(200).json({
            error: error.message
        })
    }
}