const Queue = require('bull')
const path  = require('path')
const redis = require('redis');

const client = redis.createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

client.connect();

client.on('connect', () => {
    console.log('Connected to Redis Cloud');
});
  
client.on('error', (err) => {
    console.error('Redis Error:', err);
});

const mailQueue = new Queue('mailQueue', {
    concurrency: 20,
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
        username: process.env.REDIS_USERNAME
    }
})

mailQueue.process(path.join(__dirname, 'mailQueueProcess.js'))

mailQueue.on('completed', (job) => {
    console.log(`Mail Sent`);
})