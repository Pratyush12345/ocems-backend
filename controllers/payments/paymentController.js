const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const Razorpay = require('razorpay')
const crypto = require('crypto')

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})

module.exports.createOrder = async (req, res) => {
    const { amount, currency, receipt, notes } = req.body

    razorpay.orders.create({
        amount,
        currency,
        receipt,
        notes
    })
    .then(order => {
        console.log(order)
        return res.status(200).json(order)
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    generatedSignature.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = generatedSignature.digest('hex');

    if (digest === razorpay_signature) {

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

module.exports.webhook = async (req, res) => {
    const { payload } = req.body
    const { payment } = payload
    const { entity } = payment
    const { order_id, status } = entity

    console.log(req.body.payload.payment.entity);
    if (status === 'captured') {
        console.log('webhook captured');

        return res.status(200).json({
            message: 'Payment Successful'
        })
    } else {
        console.log('webhook Failed')
        return res.status(400).json({
            message: 'Payment Failed'
        })
    }
}