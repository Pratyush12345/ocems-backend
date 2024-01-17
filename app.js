const express    = require('express');
const bodyParser = require('body-parser');
const app = express();

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
app.use('/uploads', express.static('uploads'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// implementing CORS security mechanism
app.use((req,res,next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    if(req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
        return res.status(200).json({});
    }
    next();
})

// require('./config/modbus')
require('./config/cron-job')

app.use('/', require('./routes/home'));

app.listen(process.env.PORT || 3001, () => {
    console.log(`Server started`);
})
