// create a tcp modbus client
const Modbus = require("jsmodbus");
const net = require("net");
const socket = new net.Socket();
const client = new Modbus.client.TCP(socket, 1);
const alertController = require("../controllers/plant/alertController");

const options = {
    host: "127.0.0.1",
    port: 502,
};
//192.168.0.1

socket.on("connect", function () {
    console.log(`Connected to Modbus Server at ${options.host}:${options.port}`);

    const pollingInterval = 120000; // Adjust the interval as needed
    
    setInterval(readHoldingRegister, pollingInterval);

    // make some calls

    // client.readCoils(0, 13).then(function (resp) {

    // // resp will look like { response : [TCP|RTU]Response, request: [TCP|RTU]Request }
    // // the data will be located in resp.response.body.coils: <Array>, resp.response.body.payload: <Buffer>

    // console.log(resp);

    // }, console.error);
});

const readHoldingRegister = async () => {
    try {
        client.readHoldingRegisters(0, 9)
        .then(function (resp) {
            console.log(resp.response._body.valuesAsArray);
            //socket.end()
        })
        .catch(function () {
            console.error(
                require("util").inspect(arguments, {
                    depth: null,
                })
            );
        });
    } catch (error) {
        console.error("Error reading holding register:", error);
    }
};

socket.connect(options);

// function to send a keep-alive request at an interval of 60 seconds
// connection is closed after a period of 1 min 40 seconds (100 seconds) of inactivity
setInterval(async () => {
    try {
        await client.readHoldingRegisters(0, 1)    
    } catch (error) {
        console.error("Error sending keep-alive request:", error);
    }
}, 95000);

socket.on("close", function () {
    console.log("Connection closed");
});

socket.on("error", function (err) {
    console.error("Socket error:", err);
});