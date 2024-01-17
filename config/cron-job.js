const cron = require('node-cron');
const flowController = require('../controllers/industry/flowController');

// start a cron job which runs at the start of every new month
cron.schedule('0 0 0 1 * *', async () => {
    try {
        flowController.fetchData();
    } catch (error) {
        console.log(error);
    }
});
