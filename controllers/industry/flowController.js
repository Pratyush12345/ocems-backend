const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const db = firebase.database()
const axios = require('axios')

module.exports.addapiID = async (req,res) => {
    const data = req.body.data
    const plantID = req.userData.plantID

    // Error checking
    if(!Array.isArray(data)){
        return res.status(400).json({
            message: "Data should be an array"
        })
    }

    for (let i = 0; i < data.length; i++) {
        const element = data[i];

        if(typeof element.apiID !== "number"){
            return res.status(400).json({
                message: "apiID should be a number"
            })
        }

        if(typeof element.industryID !== "string"){
            return res.status(400).json({
                message: "industryID should be a string"
            })
        }

        if(element.industryID.length===0){
            return res.status(400).json({
                message: "industryID should not be empty"
            })
        }

    }

    try {
        for (let i = 0; i < data.length; i++) {
            const element = data[i];
            
            const industry = await firestore.collection(`plants/${plantID}/industryUsers`).doc(element.industryID).get()

            if(!industry.exists){
                return res.status(404).json({
                    message: `Industry with ID ${element.industryID} doesn't exist`
                })
            }
        }

        for (let i = 0; i < data.length; i++) {
            const element = data[i];

            await firestore.collection(`plants/${plantID}/industryUsers`).doc(element.industryID).update({
                apiID: element.apiID
            })
        }

        return res.status(200).json({
            message: "API ID's added successfully"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }
    
}

/**
 * Steps:
 * 1. iterate through the plants collection
 * 2. iterate through the industryUsers collection of each plant
 * 3. get the apiID of each industryUser
 * 4. Fetch the API key and secret from the realtime database of the corresponding plantID
 * 5. get the latest flow data of each industryUser using the plant API 
 * 6. store the data in the firestore
 * 7. update the latestFlowData field of each industryUser
 */

// ! NOT Present in the routes
module.exports.fetchData = async () => {
    try {
        const plants = await firestore.collection('plants').get()
        
        const promise = plants.docs.map(async (plant) => {
            const plantID = plant.id;

            // Get the API credentials from the realtime database
            const plantApisDetails = (await db.ref(`PlantApisDetail/${plantID}/WaterAtInletApi`).once('value')).val()

            const plantApiKey = plantApisDetails.apiKey
            const plantApiSecret = plantApisDetails.apiSecretKey    
            const host = plantApisDetails.host

            const industryUsers = await firestore.collection(`plants/${plantID}/industryUsers`).get()

            const inPromise = industryUsers.docs.map(async (industry) => {
                const apiID = industry.data().apiID

                const date = new Date() 
                date.setMonth(date.getMonth()-1)
                const dateString = `${date.getFullYear()}-${date.getMonth()+1}`

                // Fetch the data from the API
                const response = await axios({
                    method: 'GET',
                    url: `${host}${plantApiKey}/${plantApiSecret}/${dateString}/${apiID}`,
                })
    
                // Store the data in firestore and
                // Update the latestFlowData field of the industryUser
                if(response.data.error){
                    industry.ref.collection('flowData').doc(dateString).set({
                        flow: null,
                        message: "No data available"
                    })
                    
                    industry.ref.update({
                        latestFlowData: {
                            flow: null,
                            month: dateString,
                            message: "No data available"
                        }
                    })
                } else {
                    industry.ref.collection('flowData').doc(dateString).set({
                        flow: response.data.flow
                    })

                    industry.ref.update({
                        latestFlowData: {
                            flow: response.data.flow,
                            month: response.data.month,
                        }
                    })
                }
                
            })

            await Promise.all(inPromise)
        })

        await Promise.all(promise)

    } catch (error) {
        console.log(error);
    }
}

module.exports.getLatestFlowData = async (req,res) => {
    const industries = req.body.industries
    const industryid = req.query.industryid
    const plantID = req.userData.plantID

    // Error checking
    if(industries && industryid){
        return res.status(400).json({
            message: "Only one of industries or industryid should be present"
        })
    } else if(industries){
        if(!Array.isArray(industries)) {
            return res.status(400).json({
                message: "industries should be an array"
            })
        }

        // industries should be an array of strings
        for (let i = 0; i < industries.length; i++) {
            const element = industries[i];
            if(typeof element !== "string"){
                return res.status(400).json({
                    message: "industries should be an array of strings"
                })
            }
        }

    } else if(!industries && !industryid){
        return res.status(200).json({
            message: "industries or IndustryID not defined"
        })
    }

    try {
        const data = []
        if(industries){
            for (let i = 0; i < industries.length; i++) {
                const element = industries[i];
                const industryData = await firestore.collection(`plants/${plantID}/industryUsers`).doc(element).get()
                data.push({
                    id: industryData.id,
                    data: industryData.data().latestFlowData
                })    
            }
        } else if(industryid){
            const industryData = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()
            data.push({
                id: industryData.id,
                data: industryData.data().latestFlowData
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

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        let plantID 
        if(admin.get('accessLevel')!==1){
            return res.status(401).json({
                message: "Only admin can access this route"
            })
        } 
        plantID = admin.get('plantID')
        
        const data = []
        if(industries){
            for (let i = 0; i < industries.length; i++) {
                const element = industries[i];
                const industryData = await firestore.collection(`plants/${plantID}/industryUsers`).doc(element).get()
                data.push({
                    id: industryData.id,
                    data: industryData.data().latestFlowData
                })    
            }
        } else if(industryid){
            const industryData = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()
            data.push({
                id: industryData.id,
                data: industryData.data().latestFlowData
            })
        }

        return res.status(200).json({
            data: data
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.getAllFlowData = async (req,res) => {
    const industryid = req.query.industryid
    const date = req.query.date
    const plantID = req.userData.plantID

    if(!industryid){
        return res.status(400).json({
            message: "Industry ID is required"
        })
    }

    try {
        const data = []

        if(date) {
            // check the format of the date to be YYYY-MM
            const dateRegex = /^\d{4}-\d{2}$/
            if(!dateRegex.test(date)){
                return res.status(400).json({
                    message: "Date should be in the format YYYY-MM"
                })
            }

            const industryData = await firestore.collection(`plants/${plantID}/industryUsers/${industryid}/flowData`).doc(date).get()
            if(!industryData.exists){
                return res.status(404).json({
                    message: "No data available"
                })
            }

            data.push({
                id: industryData.id,
                data: industryData.data()
            })
        } else {
            const industryData = await firestore.collection(`plants/${plantID}/industryUsers/${industryid}/flowData`).get()
    
            for (let i = 0; i < industryData.docs.length; i++) {
                const element = industryData.docs[i];
                
                data.push({
                    id: element.id,
                    data: element.data()
                })
            }

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
