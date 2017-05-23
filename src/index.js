/*jslint node: true, bitwise: true */
'use strict';
require('console-stamp')(console, {pattern: "yyyy-mm-dd HH:MM:ss.l"});
const dateformat = require('dateformat');
const yaml = require('js-yaml');
const fs = require('fs');
const Promise = require('bluebird');
const SensorTag = Promise.promisifyAll(require('sensortag'), {multiArgs: true});
const util = require('util');
const st = require('./st.js');
// Thingworx
const Api = require('thingworx-api').Api;
const Thing = require('thingworx-api').Thing;
const logger = require('thingworx-utils').Logger;

var config;
var api;
var sts = new Map(); // SensorTag Things
var stdb = new Map(); // SensorTag objects

var INTERVAL_MSEC_SENSORTAG = 10000; // config.yml で上書きできる
const DISCOVER_MSEC_SENSORTAG = 10000;
const FLAG_LED_RED     = 1; // 0001
const FLAG_LED_GREEN   = 2; // 0010
const FLAG_BUZZER      = 4; // 0100
const FLAG_FLASH_ERASE = 8; // 1000

const twConnect = () => {
    api.connect(() => {  // Establish a connection to thingworx
        if (!api.isConnected()) {
            console.log('WILL RETRY CONNECTING AFTER ONE MINUTE');
            Promise.delay(60 * 1000).then(() => {
                console.log('RETRY CONNECTING...');
                twConnect();
            });
        }
    });
};

const onDiscover = tag => {
    console.log("FOUND A SENSORTAG: " + tag.id);
    stdb.set(tag.id, tag);
    tag.connecting = false;
    tag.on('disconnect', () => tag.connecting = false);
    let sthing = sts.get(tag.id);
    setImmediate(() => st.subscribeValues(sthing, tag));
};

const shutdown = sig => {
    console.log("CAUGHT %s, SHUTTING DOWN...", sig);
    Promise.resolve(0)
        .then(() => {
            console.log("STOPPING SCANNING SENSORTAGS");
            SensorTag.stopDiscoverAll(tag => {});
            return Promise.resolve(0);
        })
        .then(() => console.log("DISCONNECTING ALL SENSORTAGS"))
        .then(() => Promise.each(stdb.keys(), tid => {
            let tag = stdb.get(tid);
            console.log("  TAG " + tag.id + ", " + tag.connecting);
            if (tag.connecting) {
                return tag.disconnectAsync().timeout(5000);
            } else {
                return Promise.resolve(0);
            }
        }))
        .catch(err => console.log("TIMED OUT DISCONNECTING SENSORTAGS (IGNORED)"))
        .then(() => console.log("DISCONNECTED ALL SENSORTAGS"))
        .then(() => {
            api.disconnect(err => {
                if (err) {
                    console.warn("FAILED TO DISCONNECTED THINGWORX " + err);
                    process.exit(1);
                } else {
                    console.log("DISCONNECTED THINGWORX SUCCESSFULLY");
                    process.exit(0);
                }
            });
        });
};

// main
// INTERVAL_MSEC_SENSORTAG ごとに既知のセンサータグに接続
// それまでの間は周囲のセンサータグをスキャン
Promise.resolve(0)
    .then(() => { // 初期化
        config = yaml.safeLoad(fs.readFileSync('./conf/config.yml'));
        console.log('READ CONFIG: %j', config);
        INTERVAL_MSEC_SENSORTAG = config.hasOwnProperty('stIntervalMs') ? config.stIntervalMs : INTERVAL_MSEC_SENSORTAG;
        process.NOBLE_REPORT_ALL_HCI_EVENTS = 1;
        process.env.NOBLE_HCI_DEVICE_ID = config.hasOwnProperty('bleDeviceId') ? config.bleDeviceId : 0;
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        api = new Api(config);
        api.on('connect', () => console.log("CONNECTED WITH A THINGWORX SERVER"));
        api.on('disconnect', msg => {
            console.log('DISCONNECTED: %s', msg);
            Promise.delay(60 * 1000).then(() => {
                console.log('RETRY CONNECTING...');
                twConnect();
            });
        });

        // 設定ファイルから読み込んだセンサータグ情報から ThingWorx の RemoteThing を作成
        // ボタンを押された場合のサービスもここで定義している。
        Object.keys(config.sensorTags).forEach((tid, idx, ary) => {
            let sthing = new Thing(config.sensorTags[tid]);
            sthing.addProperty({type: 'string', name: 'systemId'});
            sthing.addProperty({type: 'number', name: 'irObjectTemp'});
            sthing.addProperty({type: 'number', name: 'irAmbientTemp'});
            sthing.addProperty({type: 'number', name: 'temperature'});
            sthing.addProperty({type: 'number', name: 'humidity'});
            sthing.addProperty({type: 'number', name: 'pressure'});
            sthing.addProperty({type: 'number', name: 'lux'});
            sthing.addProperty({type: 'boolean', name: 'keyLeft'});
            sthing.addProperty({type: 'boolean', name: 'keyRight'});
            sthing.addProperty({type: 'boolean', name: 'keyReedRelay'});
            sthing.addProperty({type: 'boolean', name: 'ledRed'});
            sthing.addProperty({type: 'boolean', name: 'ledGreen'});
            sthing.addService({
                name: 'turn',
                desc: 'turn on/off the LED',
                inputs: [
                    {
                        name: 'led',
                        type: 'string'
                    }
                ],
                output_type: 'nothing',
                service_handler: function (params) {
                    let tag = stdb.get(tid);
                    if (tag) {
                        console.log(" [%s] TURN ON: %s", sthing.name, params.getValue('led'));
                        let data = 0;
                        switch (params.getValue('led')) {
                        case 'red':
                            data = FLAG_LED_RED;
                            break;
                        case 'green':
                            data = FLAG_LED_GREEN;
                            break;
                        case 'buzzer':
                            data = FLAG_BUZZER;
                            break;
                        case 'erase':
                            data = FLAG_FLASH_ERASE;
                            break;
                        }
                        st.act(tag, data);
                    } else {
                        console.log(" [%s] NO SENSOR TAG IS FOUND (%d)", sthing.name, stdb.size);
                    }
                }
            });
            sthing.bind();
            sts.set(tid, sthing);
        });

        if (config.hasOwnProperty('enableThingWorx') && config.enableThingWorx) {
            api.initialize(); // Initailize the API
            twConnect();
        }
    })
    .catch(err => {
        console.log("READ ERROR: %s", err);
        process.exit(1); // 初期化失敗は異常終了する
    })
    .then(function loop() {
        return Promise.resolve(0)
            .then(() => {
                console.log("STARTING SCANNING SENSORTAGS");
                SensorTag.discoverAll(onDiscover);
                return Promise.resolve(0);
            })
            .delay(DISCOVER_MSEC_SENSORTAG)
            .then(() => {
                SensorTag.stopDiscoverAll(onDiscover);
                // if (stdb.size > 0) {
                //     console.log("FOUND SENSORTAGS (%d)", stdb.size);
                // } else {
                //     console.warn("NO SENSORTAGS FOUND");
                // }
                return Promise.resolve(0);
            })
            .delay(INTERVAL_MSEC_SENSORTAG)
            .then(loop);
    });
