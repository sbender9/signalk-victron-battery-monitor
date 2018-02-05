/*
 * Copyright 2018 Scott Bender <scott@scottbender.net>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const _ = require('lodash')

const alarms = {
  '3': {
    path: 'batteryLowVoltage',
    message: 'The battery voltage is low'
  },
  '4': {
    path: 'batteryHighVoltage',
    message: 'The battery voltage is high'
  },
  '5': {
    path: 'batteryLowSOC',
    message: 'The battery state of charge is low'
  },
  '6': {
    path: 'batteryTwoLowVoltage',
    message: 'The second battery voltage is low'
  },
  '7': {
    path: 'batteryTwoHighVoltage',
    message: 'The second battery voltage is high'
  }
}

module.exports = function(app) {
  var plugin = {
  };
  var n2kCallback = undefined
  var state = {}
  var alarm_states = {}

  plugin.id = "victron-battery-monitor"
  plugin.name = "Victron Battery Monitor"
  plugin.description = plugin.name

  plugin.schema = {
    type: "object",
    properties: {
      alarmState: {
        title: "Alarm State",
        type: "string",
        default: "alarm",
        "enum": ["alert", "warn", "alarm", "emergency"]
      }
    }
  }
  
  plugin.start = function(options) {
    n2kCallback = (msg) => {
      try {
        var enc_msg = null
        var fields = msg['fields']

        if ( msg.pgn == 127508 )
        {
          if ( ! state[msg.src] )
            state[msg.src] = {}
          
          if ( !state[msg.src].firstInstance
               || state[msg.src].firstInstance > fields["Battery Instance"] )
          {
            state[msg.src].firstInstance = fields["Battery Instance"];
          }
        }
        else if ( msg.pgn == 61184
                  && fields['Manufacturer Code'] == 'Victron'
                  && fields['Register Id'] == 0xEEFF
                  && state[msg.src]
                  && typeof state[msg.src].firstInstance !== 'undefined')
        {
          state[msg.src].isVictron = true
          var delta = {
            "context": "vessels." + app.selfId,
            "updates": [
              {
                "source": {
                  "label": "derived-data-plugin"
                },
                "timestamp": (new Date()).toISOString(),
                "values": [
                  {
                    path: 'electrical.batteries.' + state[msg.src].firstInstance + '.capacity.dischargeSinceFull',
                    value: ((fields.Payload << 0) * 0.1) * 3600
                  }
                ]
              }
            ]
          }
          
          //app.debug("send delta: " + JSON.stringify(delta))
          app.handleMessage(plugin.id, delta)
        } else if ( msg.pgn == 127501
                    && typeof state[msg.src] !== 'undefined'
                    && state[msg.src].isVictron )
        {
          _.keys(alarms).forEach(key => {
            var state
            var info = alarms[key]
            
            if ( fields['Indicator' + key] == 'On' )
            {
              if ( !alarm_states[key] || alarm_states[key] == 'normal' )
              {
                state = options.alarmState
              }
            }
            else
            {
              if ( alarm_states[key] && alarm_states[key] !== 'normal' )
              {
                state = 'normal'
              }
            }

            if ( state )
            {
              alarm_states[key] = state
              var delta = {
                "context": "vessels." + app.selfId,
                "updates": [
                  {
                    "source": {
                      "label": "victron-battery"
                    },
                    "timestamp": (new Date()).toISOString(),
                    "values": [
                      {
                        "path": 'notifications.' + info.path,
                        "value": {
                          "state": state,
                          "method": [ "visual", "sound" ],
                          "message": info.message,
                          "timestamp": (new Date()).toISOString()
                        }
                      }]
                  }
                ]
              }
              app.debug("send delta: " + JSON.stringify(delta))
              app.handleMessage(plugin.id, delta)
            }
          });
        }
      } catch (e) {
        console.error(e)
      }
    }
    app.on("N2KAnalyzerOut", n2kCallback)
  }

  plugin.stop = function() {
    if ( n2kCallback )
    {
      app.removeListener("N2KAnalyzerOut", n2kCallback)
      n2kCallback = undefined
    }
  }

  return plugin
}
         
