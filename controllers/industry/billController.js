const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const storage = firebase.storage()
const bucket = storage.bucket()
const fs = require('fs')
const { getMessaging } = require('firebase-admin/messaging');
const db = firebase.database()
const puppeteer = require('puppeteer');
const fsEx = require('fs-extra');
const path = require('path');
const hbs = require('handlebars');
const moment = require('moment')

module.exports.getBills = async (req,res) => {
    const billid = req.query.bill
    const roleName = req.userData.role
    const plantID = req.userData.plantID
    let industryid = req.query.industryid
    
    if(roleName === 'industry'){
        industryid = req.userData.industryid
    } else if(!industryid) {
        return res.status(400).json({
            message: "Please provide industryid"
        })
    }

    try {
        const industry = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()

        if(!industry.exists){
            return res.status(404).json({
                message: "Industry Not found"
            })
        }

        let query = firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).collection('bills')
        if(billid){
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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }
}

module.exports.getBillApprovalRequests = async (req,res) => {
    const plantID = req.userData.plantID

    try {
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
                    dateAdded: data.dateAdded,
                    data: bill.data(),
                })
            }
        })

        await Promise.all(promise)

        return res.status(200).json({
            requests: requestsArray
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

// date format: MM/DD/YYYY
function isValidDate(dateString) {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    
    if (!regex.test(dateString)) {
        return false; // Invalid format
    }

    const parts = dateString.split('/');
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    const isValidMonth = month >= 1 && month <= 12;
    const isValidDay = day >= 1 && day <= 31;
    const isValidYear = year >= 1000 && year <= 9999;

    return isValidDay && isValidMonth && isValidYear;
}

module.exports.createBill = async (req, res) => {
    const description = req.body.description
    const goods = req.body.goods
    const interestRate = req.body.interestRate
    const lastDate = req.body.lastDate
    const industryid = req.params.industryid
    const amount = req.body.amount
    const plantID = req.userData.plantID

    try {
        // goods validation
        if(!goods || goods.length<1){
            return res.status(400).json({
                message: "Please provide at least one good"
            })
        }

        const date = new Date()
        
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
            let qty = good.qty
            let type = good.type

            if(!starting || !ending){
                return res.status(400).json({
                    message: `Please provide starting and ending date for good ${i+1}`
                })
            }

            // check if starting and ending are of format MM/DD/YYYY
            if(!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(starting) || !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(ending)){
                return res.status(400).json({
                    message: `Please provide starting and ending date in MM/DD/YYYY format for good ${i+1}`
                })
            }

            // check if starting and ending are valid dates
            if(!isValidDate(starting) || !isValidDate(ending)){
                return res.status(400).json({
                    message: `Please provide valid starting and ending date for good ${i+1}`
                })
            }

            // check if starting date is before ending date
            if(new Date(starting) > new Date(ending)){
                return res.status(400).json({
                    message: `Starting date should be before ending date for good ${i+1}`
                })
            }

            // check if starting date is not of future
            if(new Date(starting) > new Date()){
                return res.status(400).json({
                    message: `Starting date should not be of future for good ${i+1}`
                })
            }

            // check if ending date is not of future
            if(new Date(ending) > new Date()){
                return res.status(400).json({
                    message: `Ending date should not be of future for good ${i+1}`
                })
            }
            
            if(!qty) {
                return res.status(400).json({
                    message: `Please provide quantity for good ${i+1}`
                })
            }

            if(typeof qty !== 'number'){
                return res.status(400).json({
                    message: `qty should be a number for good ${i+1}`
                })
            }

            if(!type) {
                return res.status(400).json({
                    message: `Please provide type for good ${i+1}`
                })
            }

            if(typeof type !== 'string'){
                return res.status(400).json({
                    message: `Please provide type as string for good ${i+1}`
                })
            }

            const possibleTypes = [
                "Water Consumption good",
                "Water Flow good"
            ]

            if(!possibleTypes.includes(type)){
                return res.status(400).json({
                    message: `${type} is not a valid type for good ${i+1}`
                })
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
            paymentRecieptStatus: 0,
            quotationNo: newFullQuotaionNo,
            amount: amount
        })

        // send notification to industry
        const fcm_token = industry.get('fcm_token')

        if(fcm_token){
            try {
                
                const message = {
                    data: {
                        title: "New Bill",
                        body: `A new bill has been issued by the plant. Check it out now!`,
                        industryId: industryid,
                        billid: bill.id
                    },
                    token: fcm_token
                }
                
                await getMessaging().send(message)
    
            } catch (error) {
                console.log("Notification not sent!");
            }
        }

        return res.status(200).json({
            message: "Bill created successfully"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error.message
        })
    }
}

module.exports.uploadPaymentReciept = async (req,res) => {
    const billid = req.body.billid
    const filePath = req.file.path
    const plantID = req.userData.plantID
    const industrydocid = req.userData.industryid

    try {
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
            paymentRecieptStatus: 1,
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

        const requiredAccess = ['Industry-Read', 'Industry-Write', 'Bill-Read', 'Bill-Write']

        const promise = users.docs.map(async user => {
            const data = user.data()
            const fcm_token = data.fcm_token
            const departmentAccess = data.departmentAccess
            
            if(fcm_token){
                try {
                    // if the departmentAccess array is undefined and includes the required access array then send notification
                    if((data.accessLevel === 1) || (departmentAccess && departmentAccess.some(r=> requiredAccess.includes(r)))){
                        const message = {
                            notification: {
                                title: "New Bill Payment",
                                body: `A new bill payment receipt has been uploaded by the industry.`
                            },
                            token: fcm_token
                        }
        
                        await getMessaging().send(message)
                    }
                } catch (error) {
                    console.log("Notification not sent!");
                }
            }
        })

        await Promise.all(promise)

        // delete the file from local storage
        fs.unlinkSync(filePath)
        return res.status(200).json({
            message: "Reciept uploaded successfully"
        })
    } catch (error) {
        fs.unlinkSync(filePath)
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }
}

module.exports.processBill = async (req,res) => {
    const requestId = req.params.requestid
    const decision = req.params.decision
    const plantID = req.userData.plantID

    if(decision!=="approve" && decision!=="reject"){
        return res.status(400).json({
            message: "Please provide a valid decision"
        })
    }

    try {
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
            isPaid: isPaid,
            paymentRecieptStatus: isPaid ? 2 : 3,
        })
        
        // delete the request
        await firestore.collection(`plants/${plantID}/billAprrovalRequests`).doc(requestId).delete()

        return res.status(200).json({
            message: "Bill processed successfully"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }
}

module.exports.deleteCopy = async (req,res) => {
    const industryid = req.params.industryid
    const billid = req.params.billid
    const plantID = req.userData.plantID

    try {
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

        if(filePath){
            await bucket.file(filePath).delete()
        }

        // delete bill
        await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).collection('bills').doc(billid).delete()
        
        return res.status(200).json({
            message: "Bill successfully deleted"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }

}

const compile = async function (templateName, data) {
    const filePath = path.join(process.cwd(), './templates', `${templateName}.hbs`)
    const html = await fsEx.readFile(filePath, 'utf-8')
    return hbs.compile(html)(data)
}

hbs.registerHelper('dateFormat', (value, format) => {
    return moment(value).format(format)
})

const numberToWordsIndian = (num) => {
    if (num === 0) return 'Zero Rupees';
    let words = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    let tens = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];
    
    function numToWords(n, suffix) {
        if (n === 0) return '';
        if (n > 19) return tens[Math.floor(n / 10)] + words[n % 10] + suffix;
        else return words[n] + suffix;
    }
    
    function convertCrores(n) {
        return n >= 10 ? numToWords(Math.floor(n / 10000000), "Crore ") + convertLakhs(n % 10000000) : convertLakhs(n);
    }
    
    function convertLakhs(n) {
        return n >= 10 ? numToWords(Math.floor(n / 100000), "Lakh ") + convertThousands(n % 100000) : convertThousands(n);
    }
    
    function convertThousands(n) {
        return n >= 10 ? numToWords(Math.floor(n / 1000), "Thousand ") + convertHundreds(n % 1000) : convertHundreds(n);
    }
    
    function convertHundreds(n) {
        return n > 100 ? numToWords(Math.floor(n / 100), "Hundred ") + numToWords(n % 100, "") : numToWords(n, "");
    }
    
    let atPaise = num.toString().split(".");
    let rupees = convertCrores(Math.floor(atPaise[0]));
    let paise = atPaise.length > 1 ? convertHundreds(Math.floor(atPaise[1])) : '';
    paise = paise ? `and ${paise}Paise` : '';
    return `${rupees}Rupees ${paise}`.trim();
}

function trimToTwoDecimalPlaces(num) {
    return Math.floor(num * 100) / 100;
}

module.exports.downloadBill = async (req,res) => {
    const billid = req.query.billid
    const plantID = req.userData.plantID
    const roleName = req.userData.role
    let industryid = req.query.industryid

    if(roleName === 'industry'){
        industryid = req.userData.industryid
    } else if(!industryid) {
        return res.status(400).json({
            message: "Please provide industryid"
        })
    }

    if(!billid){
        return res.status(200).json({
            message: "Please provide billid"
        })
    }

    try {
        const industry = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()
        if(!industry.exists){
            return res.status(404).json({
                message: "Industry not found"
            })
        }

        const bill = await firestore.collection(`plants/${plantID}/industryUsers/${industryid}/bills`).doc(billid).get()
        if(!bill.exists){
            return res.status(404).json({
                message: "Bill not found"
            })
        }
        const plant = await firestore.collection('plants').doc(plantID).get()
        
        const plantData = plant.data()
        const industryData = industry.data()
        const billData = bill.data()
        const goods = billData.goods
        let tAndC = {}
        let declaration = {}
        const goodsWithCharges = []

        let totalAmount = 0

        for (let i = 0; i < goods.length; i++) {
            const good = goods[i];
            
            const masterCopyID = good.masterCopyID
            const masterCopy = await firestore.collection(`plants/${plantID}/billMasterCopy`).doc(masterCopyID).get()

            if(!masterCopy.exists){
                return res.status(404).json({
                    message: `Master copy not found for good ${i+1}`
                })
            }

            const masterCopyData = masterCopy.data()
            
            if(i === 0){
                tAndC = masterCopyData.termsAndCondn
                declaration = masterCopyData.declaration
            }

            const qty = good.qty
            const unitPrice = masterCopyData.price
            const price = unitPrice*qty
            const cgstRate = masterCopyData.cgstRate
            const sgstRate = masterCopyData.sgstRate
            const cgstAmount = (price*cgstRate)/100
            const sgstAmount = (price*sgstRate)/100
            const amount = price+cgstAmount+sgstAmount
            totalAmount += amount

            goodsWithCharges.push({
                index: i+1,
                hsn: masterCopyData.HSN_SAC_code,
                description: `${masterCopyData.description} (${good.starting}-${good.ending})`,
                qty: qty,
                unit: masterCopyData.unit,
                unitPrice: trimToTwoDecimalPlaces(unitPrice),
                price: trimToTwoDecimalPlaces(price),
                cgstRate: trimToTwoDecimalPlaces(cgstRate) + "%",
                cgstAmount: trimToTwoDecimalPlaces(cgstAmount),
                sgstRate: trimToTwoDecimalPlaces(sgstRate) + "%",
                sgstAmount: trimToTwoDecimalPlaces(sgstAmount),
                amount: trimToTwoDecimalPlaces(amount)
            })
        }
        let billDate = new Date(billData.dateCreated)
        let lastDate = new Date(billData.requiredFields.lastDate)
        billDate = `${billDate.getDate()}/${billDate.getMonth()+1}/${billDate.getFullYear()}`
        lastDate = `${lastDate.getDate()}/${lastDate.getMonth()+1}/${lastDate.getFullYear()}`

        totalAmount = trimToTwoDecimalPlaces(totalAmount)
        const data = {
            plant: {
                gst: plantData.gstin,
                name: plantData.plantName,
                address: plantData.plantAddress,
                cin: plantData.cin,
                pan: plantData.pan,
                contact: plantData.phoneNo,
                email: plantData.email,
                bankDetails: {
                    bankName: plantData.bankName,
                    branchAddress: plantData.bankBranchAddress,
                    accountNo: plantData.bankAccountNo,
                    ifsc: plantData.bankIFSCCode
                }
            },
            industry: {
                name: industryData.companyName,
                address: industryData.address,
                gst: industryData.gstin ? industryData.gstin : "",
            },
            billDetails: {
                quotationNo: billData.quotationNo,
                date: billDate,
                tAndC: tAndC,
                declaration: declaration,
                goods: goodsWithCharges,
                totalAmount: totalAmount,
                totalAmountInWords: numberToWordsIndian(totalAmount) + " Only",
                interestRate: billData.requiredFields.interestRate,
                lastDate: lastDate
            }
        }

        const content = await compile('bill', data); 

        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });        
        const page = await browser.newPage();
        await page.setContent(content);
        await page.emulateMediaType('screen');

        // Generate PDF from page content
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true
        });

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=bill.pdf');

        // Send the PDF buffer
        res.send(pdfBuffer);

        await browser.close();
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }
}

/*
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const content = await compile('bill', data)

    const filepath = `./bills/${Date.now()}-${industryid}-${billid}-bill.pdf`
    await page.setContent(content)
    await page.emulateMediaType('screen')
    await page.pdf({
        path: filepath,
        format: "A4",
        printBackground: true
    });
    await browser.close();

    fs.unlinkSync(filepath)

*/