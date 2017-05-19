/*jslint node: true, bitwise: true */
'use strict';
require('console-stamp')(console, {pattern: "yyyy-mm-dd HH:MM:ss.l"});

const TIMEOUT_MSEC_SENSORTAG = 5000;
const WAIT_MSEC_SENSORTAG = 1000;

exports.readValues = tag => {
    let vals = {};
    console.log("READING VALUES OF THE SENSORTAG: " + tag);
    return tag.connectAndSetUpAsync().timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT CONNECTING")
        .then(() => {
            console.log(" CONNECTED WITH THE SENSORTAG: " + tag);
            tag.connecting = true;
            return tag.readSystemIdAsync()
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT READING SYSTEM ID");
        })
        .then(result => {
            console.log(" SYSTEM ID: " + result[0]);
            vals['systemId'] = result[0];
            return tag.enableIrTemperatureAsync()
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT ENABLING IR")
                .delay(WAIT_MSEC_SENSORTAG);
        })
        .then(() => {
            return tag.readIrTemperatureAsync()
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT READING IR");
        })
        .then(result => {
            console.log(" IR TEMPS: " + result[0] + ", " + result[1]);
            vals['irObjectTemp'] = result[0];
            vals['irAmbientTemp'] = result[1];
            return tag.disableIrTemperatureAsync()
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT DISABLING IR");
        })
        .then(() => {
            return tag.enableHumidityAsync()
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT ENABLING HUMIDITY")
                .delay(WAIT_MSEC_SENSORTAG);
        })
        .then(() => {
            return tag.readHumidityAsync()
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT READING HUMIDITY");
        })
        .then(result => {
            console.log(" TEMP & HUMIDITY: " + result[0] + ", " + result[1]);
            vals['temperature'] = result[0];
            vals['humidity'] = result[1];
            return tag.disableHumidityAsync()
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT DISABLING HUMIDITY");
        })
        .then(() => {
            return tag.enableBarometricPressureAsync()
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT ENABLING PRESSURE")
                .delay(WAIT_MSEC_SENSORTAG);
        })
        .then(() => {
            return tag.readBarometricPressureAsync()
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT READING PRESSURE");
        })
        .then(result => {
            console.log(" PRESSURE: " + result[0]);
            vals['pressure'] = result[0];
            return tag.disableBarometricPressureAsync()
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT DISABLING PRESSURE");
        })
        .then(() => {
            if (tag.type === 'cc2650') {
                return tag.enableLuxometerAsync()
                    .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT ENABLING LUX")
                    .delay(WAIT_MSEC_SENSORTAG)
                    .then(() => {
                        return tag.readLuxometerAsync()
                            .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT READING LUX");
                    })
                    .then(result => {
                        console.log(" LUX: " + result[0]);
                        vals['lux'] = result[0];
                        return tag.disableLuxometerAsync()
                            .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT DISABLING LUX");
                    });
            } else {
                return 0;
            }
        })
        .catch(err => console.warn("SENSORTAG ERROR: " + err))
        .finally(() => {
            console.log("SENSORTAG VALUES: " + JSON.stringify(vals));
            return tag.disconnectAsync().timeout(2000, "TIMED OUT DISCONNECTING: " + tag)
                .then(() => console.log("DISCONNECTED FROM THE SENSORTAG: " + tag))
                .catch(err => console.warn("CONNECTION ERROR (IGNORED): " + err))
                .finally(() => {
                    let st = sts.get(tag.id);
                    if (st) {
                        // 取得できた値は登録する
                        Object.keys(vals).forEach((prop, idx, ary) => {
                            st.setProperty(prop, vals[prop]);
                        });
                        console.log("UPLOADED SENSORTAG VALUES");
                    }
                    return vals;
                });
        });
};

exports.subscribeValues = (st, tag) => {
    console.log("SUBSCRIBE VALUES OF THE SENSORTAG: " + tag);
    tag.on('irTemperatureChange', function (objectTemperature, ambientTemperature) {
        console.log(" [%s] IR TEMPS: %d, %d", st.name, objectTemperature, ambientTemperature);
        st.setProperty('irObjectTemp', objectTemperature);
        st.setProperty('irAmbientTemp', ambientTemperature);
    });
    tag.on('humidityChange', function (temperature, humidity) {
        console.log(" [%s] TEMP & HUMIDITY: %d, %d", st.name, temperature, humidity);
        st.setProperty('temperature', temperature);
        st.setProperty('humidity', humidity);
    });
    tag.on('barometricPressureChange', function (pressure) {
        console.log(" [%s] PRESSURE: %d", st.name, pressure);
        st.setProperty('pressure', pressure);
    });
    if (tag.type === 'cc2650') {
        tag.on('luxometerChange', function (lux) {
            console.log(" [%s] LUX: %d", st.name, lux);
            st.setProperty('lux', lux);
        });
        tag.on('simpleKeyChange', function (left, right, reedRelay) {
            console.log(" [%s] KEY: %d %d %d", st.name, left, right, reedRelay);
            st.setProperty('keyLeft', left);
            st.setProperty('keyRight', right);
            st.setProperty('keyReedRelay', reedRelay);
        });
    } else { // cc2540
        tag.on('simpleKeyChange', function (left, right) {
            console.log(" [%s] KEY: %d %d", st.name, left, right);
            st.setProperty('keyLeft', left);
            st.setProperty('keyRight', right);
        });
    }

    return tag.connectAndSetUpAsync().timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT CONNECTING")
        .then(() => {
            console.log(" CONNECTED TO THE SENSORTAG: " + tag);
            tag.connecting = true;
            return tag.readSystemIdAsync()
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT READING SYSTEM ID");
        })
        .then(result => {
            console.log(" SYSTEM ID: " + result[0]);
            st.setProperty('systemId', result[0]);
            return tag.enableIrTemperatureAsync()
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT ENABLING IR")
                .delay(WAIT_MSEC_SENSORTAG);
        })
        .then(() => {
            return tag.notifyIrTemperatureAsync()
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT SUBSCRIBING IR");
        })
        .then(() => {
            return tag.enableHumidityAsync()
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT ENABLING HUMIDITY")
                .delay(WAIT_MSEC_SENSORTAG);
        })
        .then(() => {
            return tag.notifyHumidityAsync()
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT SUBSCRIBING HUMIDITY");
        })
        .then(() => {
            return tag.enableBarometricPressureAsync()
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT ENABLING PRESSURE")
                .delay(WAIT_MSEC_SENSORTAG);
        })
        .then(() => {
            return tag.notifyBarometricPressureAsync()
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT SUBSCRIBING PRESSURE");
        })
        .then(() => {
            return tag.notifySimpleKeyAsync()
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT SUBSCRIBING SIMPLE KEY");
        })
        .then(() => {
            if (tag.type === 'cc2650') {
                return tag.enableLuxometerAsync()
                    .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT ENABLING LUX")
                    .delay(WAIT_MSEC_SENSORTAG)
                    .then(() => {
                        return tag.notifyLuxometerAsync()
                            .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT SUBSCRIBING LUX");
                    });
            } else {
                return 0;
            }
        })
        .catch(err => console.warn("SENSORTAG ERROR: " + err))
        .then(() => {
            console.log("SUBSCRIPTION HAS BEEN FINISHED");
        });
};

exports.act = (tag, data) => {
    tag.writeIoConfigAsync(1)
        .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT WRITING IO CONFIG")
        .then(() => {
            return tag.writeIoDataAsync(data)
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT TURNING ON LED");
        })
        .delay(500)
        .catch(err => console.warn("SENSORTAG ERROR: " + err))
        .finally(() => {
            return tag.writeIoDataAsync(0)
                .timeout(TIMEOUT_MSEC_SENSORTAG, "TIMED OUT TURNING OFF LED")
                .finally(() => {
                    return tag.writeIoConfigAsync(0);
                });
        });

};
