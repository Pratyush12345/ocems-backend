const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const storage = firebase.storage()
const bucket = storage.bucket()
const fs = require('fs');

module.exports.getNotices = (req,res) => {
    const adminuid = req.userData.uid
    const industryid = req.query.industryid

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        if(admin.get('accessLevel') !== 1){
            return res.status(401).json({
                message: "Unauthorized Access"
            })
        }

        const plantID = admin.get('plantID')
        let query = firestore.collection(`plants/${plantID}/notices`)
        if(industryid){
            const industry = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()
            if(!industry.exists){
                return res.status(404).json({
                    message: "Industry not found"
                })
            }

            query = query.where('industries', 'array-contains', industryid)
        }

        const notices = await query.get()
        const noticesArray = []
        notices.forEach(notice => {
            noticesArray.push(notice.data())
        })

        return res.status(200).json({
            notices: noticesArray
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })

}

module.exports.createNotice = (req,res) => {
    const industries = JSON.parse(req.body.industries)
    const description = req.body.description
    const title = req.body.title
    const adminuid = req.userData.uid
    const files = req.files
    const notices = []

    for (let i = 0; i < files.length; i++) {
        const element = files[i];
        notices.push({
            path: element.path,
            name: element.originalname
        })
    }

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        const plantID = admin.get('plantID')

        // check if all industries exist
        for (let i = 0; i < industries.length; i++) {
            const industryid = industries[i];

            const industry = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()
            if(!industry.exists){
                for (let i = 0; i < notices.length; i++) {
                    const notice = notices[i];
                    
                    fs.unlink(notice.path, (err) => {
                        console.log("Error deleting files");
                    })
                }
    
                return res.status(404).json({
                    message: "One of the Industries not found"
                })
            }
        }

        let attachments = []
        for (let i = 0; i < notices.length; i++) {
            const notice = notices[i];
            const file = await bucket.upload(notice.path, {
                destination: `plants/${plantID}/notices/${Date.now()}-${notice.name}`,
                metadata: {
                    contentType: 'application/pdf',
                },
            })

            // get the file url
            const fileRef = storage.bucket().file(file[0].name)
            const fileUrl = await fileRef.getSignedUrl({
                action: 'read',
                expires: '03-09-2491'
            })

            attachments.push({
                name: file[0].name,
                url: fileUrl[0]
            })
        }
            
        const date = new Date().toUTCString()
        await firestore.collection(`plants/${plantID}/notices`).add({
            attachments: attachments,
            industries: industries,
            creationDate: date,
            updationDate: date,
            description: description,
            isNew: true,
            title: title
        })

        // delete the files from the uploads folder
        for (let i = 0; i < notices.length; i++) {
            const notice = notices[i];
            
            fs.unlink(notice.path, (err) => {
                console.log("Error deleting files");
            })
        }

        return res.status(201).json({
            message: "Notice successfully sent to industries"
        })
    })
    .catch(err => {
        // delete the files from the uploads folder
        for (let i = 0; i < notices.length; i++) {
            const notice = notices[i];
            
            fs.unlink(notice.path, (err) => {
                console.log("Error deleting files");
            })
        }
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.deleteNotice = (req,res) => {
    const noticeid = req.params.noticeid
    const adminuid = req.userData.uid

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        const plantID = admin.get('plantID')

        const notice = await firestore.collection(`plants/${plantID}/notices`).doc(noticeid).get()
        if(!notice.exists){
            return res.status(404).json({
                message: "Notice not found"
            })
        }

        const attachments = notice.get('attachments')

        // delete the files from the storage
        for (let i = 0; i < attachments.length; i++) {
            const attachment = attachments[i];
            const fileRef = storage.bucket().file(attachment.name)
            await fileRef.delete()
        }

        await firestore.collection(`plants/${plantID}/notices`).doc(noticeid).delete()

        return res.status(201).json({
            message: "Notice successfully deleted"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}