const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const axios = require('axios')
const Razorpay = require('razorpay')

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})

module.exports.getNumberOfIndustries = async (req,res) => {
    const plantID = req.userData.plantID
    
    try {
        const industriesCount = await firestore.collection('plants').doc(plantID).collection('industryUsers').where('approved', '==', true).count().get()

        return res.status(200).json({
            count: industriesCount.data().count
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }
}

module.exports.getNumberOfIndustryRequests = async (req,res) => {
    try {
        const industryRequestsCount = await firestore.collection('industriesRequest').count().get()

        return res.status(200).json({
            count: industryRequestsCount.data().count
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }
}

module.exports.getNumberOfBillApprovalRequests = async (req,res) => {
    const plantID = req.userData.plantID
    
    try {
        const billApprovalRequestsCount = await firestore.collection(`plants/${plantID}/billAprrovalRequests`).count().get()

        return res.status(200).json({
            count: billApprovalRequestsCount.data().count
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }
}

module.exports.paymentsData = async (req,res) => {
    let count = req.query.count
    let skip = req.query.skip
    let from = req.query.from
    let to = req.query.to

    if(!from && !to){
        // get the current month unix timestamp
        from = new Date(new Date().getFullYear(), new Date().getMonth()-1, 1).getTime() / 1000;
        to = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getTime() / 1000;

    } else if ((from && !to) || (!from && to)) {
        return res.status(400).json({
            message: 'Both from and to are required'
        })

    } else {
        from = parseInt(from)
        to = parseInt(to)

        // validate if from and to are valid unix values
        if(isNaN(from) || isNaN(to)){
            return res.status(400).json({
                message: 'Invalid from or to value'
            })
        }

        // check if from and to both lie between the range [946684800, 4765046400]
        if(from < 946684800 || to < 946684800 || from > 4765046400 || to > 4765046400){
            return res.status(400).json({
                message: 'from and to should lie between the range [946684800, 4765046400]'
            })
        }

        // check if from is less than to
        if(from > to){
            return res.status(400).json({
                message: 'from should be less than to'
            })
        }
    }

    if(count){
        count = parseInt(count)
        if(isNaN(count)){
            return res.status(400).json({
                message: 'Invalid count value'
            })
        }

        // check if count is between 1 and 100
        if(count < 1 || count > 100){
            return res.status(400).json({
                message: 'count should be between 1 and 100'
            })
        }
    } else {
        count = 100
    }

    if(skip){
        skip = parseInt(skip)
        if(isNaN(skip)){
            return res.status(400).json({
                message: 'Invalid skip value'
            })
        }

        // check if skip is greater than or equal to 0
        if(skip < 0){
            return res.status(400).json({
                message: 'skip should be greater than or equal to 0'
            })
        }

    } else {
        skip = 0
    }

    try {
        let totalAmount = 0

        while(true){
            const payments = await razorpay.payments.all({
                count: count,
                skip: skip,
                from: from,
                to: to
            })

            if(payments.count === 0){
                break
            }

            payments.items.forEach(payment => {
                if(payment.status === 'captured'){
                    totalAmount += payment.amount
                }
            })

            skip += count
        }

        return res.status(200).json({
            amount: totalAmount/100
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }
}