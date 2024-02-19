const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const hbs = require('handlebars');
const moment = require('moment')

const compile = async function (templateName, data) {
    const filePath = path.join(process.cwd(), './templates', `${templateName}.hbs`)
    const html = await fs.readFile(filePath, 'utf-8')
    return hbs.compile(html)(data)
}

hbs.registerHelper('dateFormat', (value, format) => {
    return moment(value).format(format)
})

module.exports.testPdf = async (req, res) => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        const content = await compile('bill', {})

        await page.setContent(content)
        await page.emulateMediaType('screen')
        await page.pdf({
            path: './bills/output.pdf',
            format: "A4",
            printBackground: true
        });
        await browser.close();

        return res.status(200).json({
            message: "Done, pdf created"
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: error
        })
    }
}

// const pdf = require('pdf-creator-node');
// const fs = require('fs');
// const path = require('path');
// module.exports.testPdf = async (req, res) => {
//     try {
//         const template = fs.readFileSync(path.join(__dirname, './bill.html'), 'utf8');

//         var options = {
//             height: "1123px",
//             width: "794px",
//         };

//         var users = [
//             {
//                 name: "Shyam",
//                 age: "26",
//             },
//             {
//                 name: "Navjot",
//                 age: "26",
//             },
//             {
//                 name: "Vitthal",
//                 age: "26",
//             },
//         ];
//         var document = {
//             html: template,
//             data: {
//                 users: users,
//             },
//             path: path.join(__dirname, "../bills/bill.pdf"),
//         };

//         const resp = await pdf.create(document, options);
//         console.log(resp);

//         res.status(200).json({
//             message: "PDF Generated Successfully",
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({
//             message: "Failed to generate PDF",
//             error: error,
//         });
//     }
// }

/*
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

module.exports.testPdf = (req, res) => {
    const doc = new PDFDocument();

    // Set headers for PDF download in response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');

    doc.pipe(fs.createWriteStream('../bills/file.pdf')); // Write to PDF file
    doc.pipe(res); // HTTP response

    // Document Header
    doc.fontSize(10).text('GSTIN: 08AAHCB7377H1ZA', 50, 50);
    doc.text('Proforma Invoice', { align: 'center' });
    doc.text('Bhiwadi Jal Pradushan Nivaran Asso.', { align: 'center' });
    doc.text('Opposite New Bus Stand Bhiwadi Mode Bhiwadi-301019 Distt. Alwar (Raj.)', { align: 'center' });
    doc.text('CIN: U41000RJ2018NPL060720 ; PAN: AAHCB7377H', { align: 'center' });
    doc.text('Tel.: 9352449481 email: cetppradushan@gmail.com', { align: 'center' }).moveDown();

    // Party Details
    doc.fontSize(10).text('Party Details:', 50, 180);
    doc.text('M/s Ajit Yadav', 50, 195);
    doc.text('H1 1334', 50, 210).moveDown();

    // Quotation Details
    doc.text('Quotation No.: PI/1071/2023-24', 50, 225);
    doc.text('Dated: 13-06-2023', 50, 240).moveDown();

    // Items Table Header
    doc.text('S.N.', 50, 255);
    doc.text('Description of Goods', 100, 255);
    doc.text('HSN/SAC Code', 250, 255);
    doc.text('Qty. Unit', 350, 255);
    doc.text('Price Rate', 420, 255);
    doc.text('Amount (`)', 470, 255);

    // Items Table Rows
    const items = [
        { sn: '1.', description: 'Services by CETP (2016-17)', code: '999411', qty: '510.000 Sq. Mete', price: '20.00', amount: '11424.00' },
        // Repeat for other items...
    ];
    
    let y = 270;
    items.forEach(item => {
        doc.fontSize(10).text(item.sn, 50, y);
        doc.text(item.description, 100, y);
        doc.text(item.code, 250, y);
        doc.text(item.qty, 350, y);
        doc.text(item.price, 420, y);
        doc.text(item.amount, 470, y);
        y += 15;
    });

    // Footer
    doc.fontSize(10).text('Grand Total 4080.000 Sq. Mete ` 57120.00', 50, y + 20);
    // Repeat for other footer details...

    // Declaration and Terms
    doc.fontSize(10).text('Declaration', 50, y + 40);
    doc.text('Note: GST invoice will be issued at the time of payment receipt.', 50, y + 55);
    // Repeat for terms...

    // Finalize the PDF and end the stream

    doc.pipe(fs.createWriteStream('../bills/bill.pdf'));

    doc.end();

    return res.status(200).json({
        mess
    })
}



*/