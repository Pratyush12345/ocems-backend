const firebase = require('../../config/firebase')
const firestore = firebase.firestore()
const fs = require('fs');

module.exports.createNotice = (req,res) => {
    const industryid = req.params.industryid
    const description = req.body.description
    const title = req.body.title
    const adminuid = req.userData.uid
    const files = req.files
    const notices = []

    for (let i = 0; i < files.length; i++) {
        const element = files[i];
        notices.push(element.path)
    }

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        const plantID = admin.get('plantID')

        const industry = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()
        if(!industry.exists){
            for (let i = 0; i < notices.length; i++) {
                const notice = notices[i];
                
                fs.unlink(notice, (err) => {
                    console.log("Error deleting files");
                })
            }

            return res.status(404).json({
                message: "Industry not found"
            })
        }

        const date = new Date().toUTCString()
        await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).collection('notices').add({
            attachments: notices,
            creationDate: date,
            updationDate: date,
            description: description,
            isNew: true,
            title: title
        })

        return res.status(201).json({
            message: "Notice successfully sent to industry"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.updateNotice = (req,res) => {
    const industryid = req.params.industryid
    const noticeid = req.params.noticeid
    const updates = req.body.updates
    const adminuid = req.userData.uid

    if(updates['attachments']!==undefined){
        return res.status(400).json({
            message: "Can't update attachments via this route"
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
        
        const industry = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()
        if(!industry.exists){
            return res.status(404).json({
                message: "Industry not found"
            })
        }

        const notice = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).collection('notices').doc(noticeid).get()
        if(!notice.exists){
            return res.status(404).json({
                message: "Notice not found"
            })
        }

        updates['updationDate']=new Date().toUTCString()
        await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).collection('notices').doc(noticeid).update(updates)

        return res.status(201).json({
            message: "Notice successfully updated"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.updateNoticeAttachments = (req,res) => {
    const industryid = req.params.industryid
    const noticeid = req.params.noticeid
    const adminuid = req.userData.uid

    const files = req.files
    const notices = []

    for (let i = 0; i < files.length; i++) {
        const element = files[i];
        notices.push(element.path)
    }

    firestore.collection('users').doc(adminuid).get()
    .then(async admin => {
        if(!admin.exists){
            return res.status(404).json({
                message: "Admin doesn't exist"
            })
        }

        const plantID = admin.get('plantID')

        const industry = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()
        if(!industry.exists){
            return res.status(404).json({
                message: "Industry not found"
            })
        }

        const notice = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).collection('notices').doc(noticeid).get()
        if(!notice.exists){
            return res.status(404).json({
                message: "Notice not found"
            })
        }
        const attachments = notice.get('attachments')
        attachments.push(...notices)

        await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).collection('notices').doc(noticeid).update({
            attachments: attachments
        })

        return res.status(201).json({
            message: "Notice successfully updated"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

// add an attachment delete endpoint for future

module.exports.deleteNotice = (req,res) => {
    const industryid = req.params.industryid
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

        const industry = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).get()
        if(!industry.exists){
            return res.status(404).json({
                message: "Industry not found"
            })
        }

        const notice = await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).collection('notices').doc(noticeid).get()
        if(!notice.exists){
            return res.status(404).json({
                message: "Notice not found"
            })
        }
        const attachments = notice.get('attachments')

        for (let i = 0; i < attachments.length; i++) {
            const attachment = attachments[i];

            fs.unlink(attachment, (err) => {
                console.log("Error deleting files");
            })
        }

        await firestore.collection(`plants/${plantID}/industryUsers`).doc(industryid).collection('notices').doc(noticeid).delete()

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