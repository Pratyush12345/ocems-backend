const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const storage = firebase.storage()
const bucket = storage.bucket()
const fs = require('fs')
const { getMessaging } = require('firebase-admin/messaging');

module.exports.getBills = (req,res) => {
    const adminuid = req.userData.uid
    const industryid = req.params.industryid
    const billid = req.query.bill

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        if(admin.get('accessLevel')!==1){
            return res.status(401).json({
                message: "Only admin can perform billing operations"
            })
        }

        const plantID = admin.get('plantID')

        const industry = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()

        if(!industry.exists){
            return res.status(404).json({
                message: "Industry Not found"
            })
        }

        let query = firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).collection('bills')
        if(billid!==undefined){
            query = query.doc(billid)

            const bill = await query.get()
            if(!bill.exists){
                return res.status(404).json({
                    message: "Bill not found"
                })
            }

            return res.status(200).json({
                bill: {
                    id: bill.id,
                    data: bill.data()
                }
            })
        }
        const bills = await query.get()
        let billsArray = []

        bills.forEach(bill => {
            billsArray.push({
                id: bill.id,
                data: bill.data()
            })
        })

        return res.status(200).json({
            bills: billsArray
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.getBillApprovalRequests = async (req,res) => {
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
                message: "Only admin can perform billing operations"
            })
        }

        const plantID = admin.get('plantID')

        const requests = await firestore.collection(`plants/${plantID}/billAprrovalRequests`).get()
        let requestsArray = []

        const promise = requests.docs.map(async request => {
            const data = request.data()
            const industryid = data.industryid
            const billid = data.billid

            const bill = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).collection('bills').doc(billid).get()
            if(bill.exists){
                requestsArray.push({
                    id: bill.id,
                    industryid: industryid,
                    data: bill.data(),
                })
            }
        })

        await Promise.all(promise)

        return res.status(200).json({
            requests: requestsArray
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.createBill = async (req, res) => {
    const description = req.body.description
    const goods = req.body.goods
    const interestRate = req.body.interestRate
    const lastDate = req.body.lastDate
    const industryid = req.params.industryid
    const amount = req.body.amount
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
                message: "Only admin can perform billing operations"
            })
        }

        // goods validation
        if(goods===undefined || goods.length<1){
            return res.status(400).json({
                message: "Please provide at least one good"
            })
        }

        const date = new Date()
        const plantID = admin.get('plantID')
        
        const industry = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()
        if(!industry.exists){
            return res.status(404).json({
                message: "Industry not found"
            })
        }

        for (let i = 0; i < goods.length; i++) {
            const good = goods[i];
    
            let starting = good.starting
            let ending = good.ending
    
            if(good.isYearlyorMonthtly!=="Monthly" && good.isYearlyorMonthtly!=="Yearly"){
                return res.status(400).json({
                    message: `Please provide valid isYearlyorMonthtly value for good ${i+1}`
                })
            }
            
            if(good.isYearlyorMonthtly==="Yearly"){
                starting = parseInt(starting)
                ending = parseInt(ending)
                
                if(starting.toString().length!==4 || ending.toString().length!==4){
                    return res.status(400).json({
                        message: `Please provide starting and ending year as four digits integer for good ${i+1}`
                    })
                }

                if(starting>=ending){
                    return res.status(400).json({
                        message: `The starting year should be strictly less than the ending year of good ${i+1}`
                    })
                }

                if(date.getFullYear()<ending){
                    return res.status(400).json({
                        message: `Can't create a bill for future for good ${i+1}`
                    })
                }
                
            } else {
                const startingMonth = parseInt(starting.substr(0,2))
                const endingMonth = parseInt(ending.substr(0,2))
                const startingYear = parseInt(starting.substr(3))
                const endingYear = parseInt(ending.substr(3))

                if(startingMonth>12 || endingMonth>12){
                    return res.status(400).json({
                        message: `Please provide valid month value for good ${i+1}`
                    })
                }

                if(date.getFullYear()<endingYear){
                    return res.status(400).json({
                        message: `Can't create a bill for future for good ${i+1}`
                    })
                }

                if(starting.substr(0,2).charAt(1)==='/'){
                    return res.status(400).json({
                        message: `Please provide starting month as two digits integer, eg. 05, 06 for good ${i+1}`
                    })
                }

                if(ending.substr(0,2).charAt(1)==='/'){
                    return res.status(400).json({
                        message: `Please provide ending month as two digits integer, eg. 05, 06 for good ${i+1}`
                    })
                }

                // not checking for startingMonth>=endingMonth as it is possible in the case for eg. 10/2023 to 02/2024
                if(startingMonth===endingMonth && startingYear===endingYear){
                    return res.status(400).json({
                        message: `Starting month can't be same as ending month for the same year for good ${i+1}`
                    })
                }

                if(startingYear>endingYear) {
                    return res.status(400).json({
                        message: `Starting year can't be greater than ending year for good ${i+1}`
                    })
                }
            }
            
            const masterBill = await firestore.collection(`plants/${plantID}/billMasterCopy`).doc(good.masterCopyID).get()
    
            if(!masterBill.exists){
                return res.status(404).json({
                    message: `No master bill copy was found for good ${i+1}`
                })
            }
        }

        const plant = await firestore.collection('plants').doc(plantID).get()
        const currentFullQuotationNo = plant.get('currentQuotationNo')  // PI/1072/2023-24
        let newFullQuotaionNo
        /**
         * Quotation no. check for year change
         * 1. fetch the current year (today)
         * 2. get the year from the quotation no and convert to int 
         * 3. compare the current year and current quotation no year
         * 4. if both same, 
         *      4.1 calculate the incremented quotation no value (like 1072->1073)
         *      4.2 generate a new full quotation string using the new quotation no
         *      4.3 update the new quotation string in the plants collection
         * 5. else 
         *      5.1 calculate the next year (i.e. if year is 2024 then convert it to 2025)
         *      5.2 generate a new year string (2024-25 using only last two digits of the next year)
         *      5.3 generate the new full quotation string starting the quotation no from 1000
         *      5.4 update the new quotation string and the starting quotation string in the plants collection
         * 
         * consideration-> if quotation count increases to 5 digits, then calculations would go wrong
         */
        const currentYear = date.getFullYear()
        const currentQuotationNoYear = parseInt(currentFullQuotationNo.substring(currentFullQuotationNo.indexOf('/', currentFullQuotationNo.indexOf('/') + 1) + 1, currentFullQuotationNo.indexOf('/', currentFullQuotationNo.indexOf('/') + 1) + 5));
        
        if(currentQuotationNoYear===currentYear){
            const newQuotationNo = parseInt(currentFullQuotationNo.substring(currentFullQuotationNo.indexOf('/') + 1, currentFullQuotationNo.indexOf('/', currentFullQuotationNo.indexOf('/') + 1)))+1
            const yearString = currentFullQuotationNo.substring(currentFullQuotationNo.indexOf('/', currentFullQuotationNo.indexOf('/') + 1) + 1);
            newFullQuotaionNo = `${currentFullQuotationNo.substr(0,3)}${newQuotationNo}/${yearString}`

            await firestore.collection('plants').doc(plantID).update({
                currentQuotationNo: newFullQuotaionNo
            })
        } else {
            const toYear = (currentYear+1).toString().substring(2)
            const yearString = `${currentYear}-${toYear}`
            
            newFullQuotaionNo = `${currentFullQuotationNo.substr(0,3)}0000/${yearString}`

            await firestore.collection('plants').doc(plantID).update({
                currentQuotationNo: newFullQuotaionNo,
                startingQuotationNo: newFullQuotaionNo
            })
        }

        const bill = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).collection('bills').add({
            dateCreated: date.toUTCString(),
            dateUpdated: date.toUTCString(),
            requiredFields: {
                interestRate: interestRate,
                lastDate: lastDate
            },
            datePaid: null,
            description: description,
            goods: goods,
            isPaid: false,
            paymentRecieptLink: "",
            quotationNo: newFullQuotaionNo,
            amount: amount
        })

        // send notification to industry
        const fcm_token = industry.get('fcm_token')

        const message = {
            data: {
                title: "New Bill",
                body: `A new bill has been issued by the plant. Check it out now!`,
                industryId: industryid,
                billid: bill.id
            },
            token: fcm_token
        }

        const result = await getMessaging().send(message)
        
        return res.status(200).json({
            message: "Bill created successfully"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.uploadPaymentReciept = (req,res) => {
    const billid = req.body.billid
    const industryuid = req.userData.uid
    const filePath = req.file.path

    firebase.auth().getUser(industryuid)
    .then(async industry => {
        const plantID = industry.customClaims.plantID
        const industrydocid = industry.customClaims.industryid

        const bill = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industrydocid).collection('bills').doc(billid).get()
        if(!bill.exists){
            return res.status(404).json({
                message: "Bill not found"
            })
        }

        // upload file to firebase storage
        const uploadedFile = await bucket.upload(filePath, {
            destination: `plants/${plantID}/industryUsers/${industrydocid}/bills/${billid}/${Date.now()}-${req.file.originalname}`,
        })

        // get the file url
        const fileRef = storage.bucket().file(uploadedFile[0].name)
        const fileUrl = await fileRef.getSignedUrl({
            action: 'read',
            expires: '03-09-2491'
        })

        await firestore.collection(`plants/${plantID}/industryUsers`).doc(industrydocid).collection('bills').doc(billid).update({
            dateUpdated: new Date().toUTCString(),
            datePaid: new Date().toUTCString(),
            paymentRecieptLink: fileUrl[0],
            paymentRecieptPath: uploadedFile[0].name,
        })

        // add the reciept for approval from admin
        await firestore.collection(`plants/${plantID}/billAprrovalRequests`).doc(billid).set({
            dateAdded: new Date().toUTCString(),
            industryid: industrydocid,
            plantID: plantID,
            billid: billid
        })
    
        // send notification to all the users who have industry-read access or industry-write access or both
        const users = await firestore.collection('users').where('plantID', '==', plantID).get()

        const requiredAccess = ['Industry-Read', 'Industry-Write']

        const promise = users.docs.map(async user => {
            const data = user.data()
            const fcm_token = data.fcm_token
            const departmentAccess = data.departmentAccess

            // if the departmentAccess array is undefined and includes the required access array then send notification
            if((data.accessLevel === 1) || (departmentAccess!==undefined && departmentAccess.some(r=> requiredAccess.includes(r)))){
                const message = {
                    notification: {
                        title: "New Bill Payment",
                        body: `A new bill payment receipt has been uploaded by the industry.`
                    },
                    token: fcm_token
                }

                await getMessaging().send(message)
            }
        })

        await Promise.all(promise)

        // delete the file from local storage
        fs.unlinkSync(filePath)
        return res.status(200).json({
            message: "Reciept uploaded successfully"
        })
    })
    .catch(err => {
        fs.unlinkSync(filePath)
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.processBill = (req,res) => {
    const adminuid = req.userData.uid
    const requestId = req.params.requestid
    const decision = req.params.decision

    if(decision!=="approve" && decision!=="reject"){
        return res.status(400).json({
            message: "Please provide a valid decision"
        })
    }

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin not found"
            })
        }

        if(admin.get('accessLevel')!==1){
            return res.status(401).json({
                message: "Only admin can perform this operation"
            })
        }

        const plantID = admin.get('plantID')

        const request = await firestore.collection(`plants/${plantID}/billAprrovalRequests`).doc(requestId).get()
        if(!request.exists){
            return res.status(404).json({
                message: "Request not found"
            })
        }

        const bill = await firestore.collection(`plants/${plantID}/industryUsers`).doc(request.get('industryid')).collection('bills').doc(request.get('billid')).get()
        if(!bill.exists){
            return res.status(404).json({
                message: "Bill not found"
            })
        }
        
        const isPaid = decision === "approve" ? true : false
        await firestore.collection(`plants/${plantID}/industryUsers`).doc(request.get('industryid')).collection('bills').doc(request.get('billid')).update({
            dateUpdated: new Date().toUTCString(),
            isPaid: isPaid
        })
        
        // delete the request
        await firestore.collection(`plants/${plantID}/billAprrovalRequests`).doc(requestId).delete()

        return res.status(200).json({
            message: "Bill processed successfully"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.deleteCopy = (req,res) => {
    const industryid = req.params.industryid
    const billid = req.params.billid
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
                message: "Only admin can perform billing operations"
            })
        }

        const plantID = admin.get('plantID')

        const industry = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()

        if(!industry.exists){
            return res.status(404).json({
                message: "Industry Not found"
            })
        }
        
        const bill = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).collection('bills').doc(billid).get()

        if(!bill.exists){
            return res.status(404).json({
                message: "Bill not found"
            })
        }

        // delete the reciept from firebase storage
        const filePath = bill.get('paymentRecieptPath')
        if(filePath!=="" || filePath!==undefined){
            await bucket.file(filePath).delete()
        }

        // delete bill
        await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).collection('bills').doc(billid).delete()
        
        return res.status(200).json({
            message: "Bill successfully deleted"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}