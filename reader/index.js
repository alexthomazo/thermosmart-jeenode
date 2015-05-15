var i2c = require('i2c'),
    mqtt = require('mqtt');

var maxSensors = 8;
var address = 0x18;

var wire = new i2c(address, {device: '/dev/i2c-1'});
var client  = mqtt.connect('mqtt://localhost');

wire.setAddress(0x7);

function readJeeNode() {
    var id, temp, decTemp;

    wire.readBytes(null, 3 * maxSensors, function(err,res) {
        for (var i = 0 ; i < maxSensors ; i++) {
            id = res.readUInt8(i*3);
            temp = res.readUInt8(i*3+1);
            decTemp = res.readUInt8(i*3+2);

            //for temp, the first bit = 1 if the temperature is negative
            //the remaining is the actual temperature

            if (id != 0) {
                client.publish('thermosmart/temperature', JSON.stringify({
                    id: id.toString(16), //hex display
                    temp: (temp & 0x80 ? "-" : "") + (temp & 0x7f) + "." + decTemp,
                    timestamp: new Date().toISOString()
                }));
            }
        }
    });
    setTimeout(readJeeNode, 5000);
}

client.on('connect', function () {
    readJeeNode();
});