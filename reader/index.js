var i2c = require('i2c'),
	mqtt = require('mqtt');

//number of sensors stored on JeeNode, must be equals to MAX_SENSORS in thermosmart.ino
var maxSensors = 8;
//i2c address of the reader
var own_address = 0x18;
//i2c jeenode address, must be equals to I2C_ADDRESS in thermosmart.ino
var jeenode_address = 0x7;

//prefix topic for publishing temperatures
var mqtt_base_topic = 'thermosmart/temperature/';
var mqtt_monitor_topic = 'thermosmart/monitor/temperature';

//setup i2c communication
var wire = new i2c(own_address, {device: '/dev/i2c-1'});
wire.setAddress(jeenode_address);

//setup mqtt communication
var client  = mqtt.connect('mqtt://localhost');

//current temperature state
var state = {};

/**
 * Read temperatures through JeeNode over I2C then send it to MQTT if temperature changed from last reading
 */
function readJeeNode() {
	var id, temp, decTemp;

	wire.readBytes(null, 3 * maxSensors, function(err,res) {
		for (var i = 0 ; i < maxSensors ; i++) {
			id = res.readUInt8(i*3); //hex display
			temp = res.readUInt8(i*3+1);
			decTemp = res.readUInt8(i*3+2);


			if (id != 0) {
				var hexId = id.toString(16); //hex display

				//for temp, the first bit = 1 if the temperature is negative
				//the remaining is the actual temperature
				var msg = {
					t: parseFloat((temp & 0x80 ? "-" : "") + (temp & 0x7f) + "." + decTemp),
					d: new Date().toISOString()
				};

				if (!state[hexId] || state[hexId] != msg.t) {
					//only publish if temperature change
					client.publish(mqtt_base_topic + hexId, JSON.stringify(msg), { retain: true });
				}

				//always publish into monitoring to get the last received event to detect lost of a sensor
				client.publish(mqtt_monitor_topic + '/' + hexId, JSON.stringify(new Date().toISOString()), { retain: true });

			}
		}
	});
	setTimeout(readJeeNode, 5000);
}

function monitor() {
	//publish each 30s that the server is still alive
	client.publish(mqtt_monitor_topic, JSON.stringify(new Date().toISOString()), { retain: true });
	setTimeout(monitor, 30000);
}

client.on('message', function(topic, message) {
	var id = topic.substr(topic.lastIndexOf('/') + 1);
	var msg = JSON.parse(message);
	state[id] = msg.t;
});

client.on('connect', function () {
	monitor();

	//read previous state persisted into mqtt broker
	client.subscribe(mqtt_base_topic + "#");

	//wait a little bit to read persisted messages
	setTimeout(readJeeNode, 1000);
});