const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const storage = firebase.storage()
const bucket = storage.bucket()
const fs = require('fs');
const { getMessaging } = require('firebase-admin/messaging');

/**
 * Admin side
 *      1. Get all notices
 *      2. Get notices by industryid
 *      3. Get notice by noticeid
 * Industry side
 *      1. Get all notices
 *      2. Get notice by noticeid
 */
module.exports.getNotices = (req,res) => {
    const adminuid = req.userData.uid
    let industryid = req.query.industryid
    const noticeid = req.query.noticeid

    if(industryid && noticeid){
        return res.status(400).json({
            message: "Only one of industryid or noticeid is allowed"
        })
    }

    firebase.auth().getUser(adminuid)
    .then(async admin => {
        let plantID
        const role = admin.customClaims.role

        if(role === 'industry'){
            if(industryid){
                return res.status(400).json({
                    message: "industryid is not allowed for industry role"
                })
            }
            plantID = admin.customClaims.plantID
            industryid = admin.customClaims.industryid
        } else if (role === 'admin'){
            const adminData = await firestore.collection('users').doc(adminuid).get()
            plantID = adminData.get('plantID')
        } else {
            return res.status(401).json({
                message: "Unauthorized Access"
            })
        }

        // Get all notices
        let query = firestore.collection(`plants/${plantID}/notices`)
        if(industryid){
            query = query.where('industries', 'array-contains', industryid)
        }
        if(role === "admin" && noticeid){
            query = query.doc(noticeid)
        }
        let snapshot = await query.get()

        let notices = []
        
        if(!snapshot.docs)
        snapshot = [snapshot]
    
        snapshot.forEach(doc => {
            notices.push({
                id: doc.id,
                data: doc.data()
            })
        })
        
        if(role === 'industry' && noticeid){
            notices = notices.filter(notice => notice.id === noticeid)
        }

        return res.status(200).json({
            notices: notices
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
        
        // upload the files to the storage
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

        // send notification to all industries
        for (let i = 0; i < industries.length; i++) {
            const industryid = industries[i];
            
            const industry = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()
            const fcm_token = industry.get('fcm_token')

            const message = {
                notification: {
                    title: "New Notice",
                    body: `A new notice has been issued by the plant.`
                },
                token: fcm_token
            }

            await getMessaging().send(message)
        }

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

module.exports.updateNotice = (req,res) => {
    const adminuid = req.userData.uid
    const isNew = req.body.isNew
    const noticeid = req.params.noticeid
    const industryid = req.params.industryid

    if(!industryid){
        return res.status(400).json({
            message: "industryid is required"
        })
    }

    if(!noticeid){
        return res.status(400).json({
            message: "noticeid is required"
        })
    }

    if(isNew===undefined){
        return res.status(400).json({
            message: "isNew is required"
        })
    }
    
    // isNew is a boolean value
    if(typeof isNew !== 'boolean'){ 
        return res.status(400).json({
            message: "isNew must be a boolean value"
        })
    }

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

        const industry = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()

        if(!industry.exists){
            return res.status(404).json({
                message: "Industry not found"
            })
        }

        const notice = await industry.ref.collection('notices').doc(noticeid).get()

        if(!notice.exists){
            return res.status(404).json({
                message: "Notice not found"
            })
        }

        await notice.ref.update({
            isNew: isNew
        })

        return res.status(201).json({
            message: "Notice updated successfully"
        })
    })
    .catch(err => {
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