/* Copyright 2018-present Samsung Electronics Co., Ltd. and other contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var CloudDevice = require('clouddevice');
var Sensors = require('sensor');
var config = require('./config').get();
var mixin = require('util').mixin;
var log = require('log');

var sensors = new Sensors(config);
var device = new CloudDevice(config.auth);

var lastSyncDate = Date.now();
var syncInterval = config.sync.interval || 2000;

function syncData(error, results) {
  if (error) {
    console.error(error);
    return;
  }

  // sync if results exist
  if (results.length) {
    var curDate = Date.now();
    var uptime = Math.floor((curDate - lastSyncDate)/100) * 100;
    var data = {
      id: config.id,
      uptime: uptime,
    };

    lastSyncDate = curDate;

    results.forEach(function(item) {
      data[item.name] = item.value;
    });

    // post data
    log('sync...');
    device.postMessage(data, function(error, data, res) {
      error ? log(error) : log('done ' + res.headers['X-Rate-Limit-Remaining']);
      requestSyncSensors();
    });
  }
}

function requestSyncSensors() {
  setTimeout(function() {
    sensors.fetch(syncData);
  }, syncInterval);
}

function subscribeAction() {
  device.subscribeAction(function(action) {
    if (action) {
      switch (action.name) {
        case 'setOn':
          log(action.name);
          sensors.setAirQuality(30);
          break;
        case 'setOff':
          log(action.name);
          sensors.setAirQuality(0);
          break;
        case 'setMode':
        default:
          break;
      }
    }
  });
};

requestSyncSensors();
subscribeAction();

log('sensors on #' + config.id + ' start monitoring');



// backup
function requestLastAction(interval) {
  setTimeout(function() {
   device.getLastAction(function(error, action) {
     if (action) {
       switch (action.name) {
         case 'setOn':
           log(action.name);
           sensors.setAirQuality(30);
           break;
         case 'setOff':
           log(action.name);
           sensors.setAirQuality(0);
           break;
         case 'setMode':
         default:
           break;
       }
     }

     requestLastAction();
   });
  }, interval || 2000);
 }
