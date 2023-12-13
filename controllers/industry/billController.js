const firebase = require('../../config/firebase')
const firestore = firebase.firestore()

module.exports.createBill = async (req, res) => {
    const description = req.body.description
    const goods = req.body.goods
    const interestRate = req.body.interestRate
    const lastDate = req.body.lastDate
    const industryid = req.params.industryid
    const amount = req.body.amount
    // const adminuid = req.userData.uid
    const adminuid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"

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
        if(goods.length<=1){
            return res.status(400).json({
                message: "Please provide at least one good"
            })
        }

        const date = new Date()
        const plantID = admin.get('plantID')

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
                
                if(starting>=ending){
                    return res.status(400).json({
                        message: `The starting year should be strictly less than the ending year of good ${i+1}`
                    })
                }
                
            } else {
                const startingMonth = parseInt(starting.substr(0,2))
                const endingMonth = parseInt(ending.substr(0,2))
                const startingYear = parseInt(starting.substr(3))
                const endingYear = parseInt(ending.substr(3))

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

            // await firestore.collection('plants').doc(plantID).update({
            //     currentQuotationNo: newFullQuotaionNo
            // })
        } else {
            const toYear = (currentYear+1).toString().substring(2)
            const yearString = `${currentYear}-${toYear}`
            
            newFullQuotaionNo = `${currentFullQuotationNo.substr(0,3)}0000/${yearString}`

            // await firestore.collection('plants').doc(plantID).update({
            //     currentQuotationNo: newFullQuotaionNo,
            //     startingQuotationNo: newFullQuotaionNo
            // })
        }

        await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).collection('bills').add({
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

module.exports.deleteCopy = (req,res) => {
    const billid = req.body.billid
    const industryid = req.body.industryid
    // const adminuid = req.userData.uid
    const adminuid = "oYwIqg8WTbOxGRpCOM4v3zKkECn1"

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

        // delete bill
        await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).collection('bills').doc(billid).delete()
        
        return res.status(200).json({
            message: "Bill master copy successfully deleted"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}