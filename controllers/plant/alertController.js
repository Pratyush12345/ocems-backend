const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const { getMessaging } = require('firebase-admin/messaging');

function extractInstrumentCode(inputString) {
    const match = inputString.match(/^[A-Za-z\s]+/);
    return match ? match[0] : null;
}

module.exports.getAlerts = async (req,res) => {
    const location = req.query.location
    const plantID = req.userData.plantID

    try {
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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.alertsCount = async (req,res) => {
    const plantID = req.userData.plantID

    try {
        const count = (await firestore.collection(`plants/${plantID}/InstrumentAlerts`).count().get()).data().count

        return res.status(200).json({
            count: count
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

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
        const adminuid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"
        const admin = await firestore.collection('users').doc(adminuid).get()
        const fcm_token = admin.get('fcmToken')
        const message = {
            notification: {
                title: "Instrument Alert!!",
                body: `An instrument has crossed the threshold value.`
            },
            token: fcm_token
        }

        await getMessaging().send(message)

        return res.status(200).json({
            message: "noti sent"
        })
    } catch (error) {
        return res.status(200).json({
            error: error.message
        })
    }
}