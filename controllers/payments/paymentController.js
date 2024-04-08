const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const Razorpay = require('razorpay')
const crypto = require('crypto')

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})

/**
 * Requirements:
 *  - amount
 *  - currency
 *  - receipt
 *  - notes
 *      - plant ID
 *      - industry document id
 *      - bill ID
 *      - quotation number
 */

module.exports.createOrder = async (req, res) => {
    const { amount, currency, receipt, notes } = req.body

    try {
        const payment = await razorpay.orders.create({
            amount: amount,
            currency: currency,
            receipt: receipt,
            notes: notes
        })
        console.log(payment);

        return res.status(200).json(payment)

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.createOrderWithTransfersAPI = async (req, res) => {
    const { amount, currency, receipt, notes } = req.body

    const plantID = notes.plantId

    try {
        const plant = await firestore.collection('plants').doc(plantID).get()
        if (!plant.exists) {
            return res.status(404).json({
                message: 'Plant not found'
            })
        }

        const razorpayAccountDetails = plant.get('razorpayAccountDetails')

        if (!razorpayAccountDetails) {
            return res.status(404).json({
                message: 'Razorpay Account Details not found'
            })
        }

        const linkedAccountId = razorpayAccountDetails.id

        if (!linkedAccountId) {
            return res.status(404).json({
                message: 'Linked Account ID not found'
            })
        }

        const payment = await razorpay.orders.create({
            amount: amount,
            currency: currency,
            receipt: receipt,
            notes: notes,
            transfers: [
                {
                    account: linkedAccountId,
                    amount: amount,
                    currency: "INR",
                    on_hold: 0
                }
            ]
        })

        return res.status(200).json(payment)

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

module.exports.verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    generatedSignature.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = generatedSignature.digest('hex');

    if (digest === razorpay_signature) {
        const order = await razorpay.orders.fetch(razorpay_order_id)

        const timestamp = new Date(order.created_at * 1000)

        await capturedOrder(order.notes, timestamp, { orderid: order.id, paymentid: razorpay_payment_id })
        
        return res.status(200).json({
            message: 'Payment Successful'
        })
    } else {
        console.log('Payment Failed')
        return res.status(400).json({
            message: 'Payment Failed'
        })
    }
}

/**
 * Requirements:
 *  - id
 *  - order_id
 *  - method
 *  - status
 *  - card_id
 *  - bank
 *  - wallet
 *  - vpa
 *  - fee
 *  - tax
 *  - acquirer_data
 */
module.exports.webhook = async (req, res) => {
    const { payload } = req.body
    const { payment } = payload
    const { entity } = payment
    const { id, order_id, status, method, card_id, bank, wallet, vpa, fee, tax, acquirer_data, notes, created_at } = entity

    const payment_data = {
        id,
        order_id,
        status,
        method,
        card_id,
        bank,
        wallet,
        vpa,
        fee,
        tax,
        acquirer_data,
        created_at
    }

    if (status === 'captured') {
        res.status(200).json({
            message: 'Payment Successful'
        })

        const timestamp = new Date(created_at * 1000)
        await capturedOrder(notes, timestamp, payment_data)
    } else {
        console.log('webhook Failed')
        return res.status(400).json({
            message: 'Payment Failed'
        })
    }
}

const capturedOrder = async (notes, timestamp, payment_data) => {
    const { plantId, industryId, billId } = notes

    firestore.collection('plants').doc(plantId).get()
    .then(async plant => {
        if(plant.exists) {
            const industry = await firestore.collection(`plants/${plantId}/industryUsers`).doc(industryId).get()
            
            if(industry.exists) {
                const bill = await firestore.collection(`plants/${plantId}/industryUsers`).doc(industryId).collection('bills').doc(billId).get()
                
                if(bill.exists) {

                    await firestore.collection(`plants/${plantId}/industryUsers`).doc(industryId).collection('bills').doc(billId).update({
                        datePaid: timestamp.toUTCString(),
                        dateUpdated: timestamp.toUTCString(),
                        isPaid: true,
                        paymentData: payment_data,
                        paymentRecieptLink: ""
                    })

                } else {
                    console.log('Bill does not exist')
                }
            } else {
                console.log('Industry does not exist')
            }
        }
    })
    .catch(err => {
        console.log(err);
    })
}