# signalk-victron-battery-monitor

[![Greenkeeper badge](https://badges.greenkeeper.io/sbender9/signalk-victron-battery-monitor.svg)](https://greenkeeper.io/)

Signal K plugin to process proprietary battery sentences from the Victron BMV70x with a VE.Direct to NMEA 2000 cable.


It uses pgn 61184 to provide electrical.batteries.x.capacity.dischargeSinceFull.

It uses pgn 127501 to raise the follow notifications:

* batteryLowVoltage
* batteryHighVoltage
* batteryLowSOC
* batteryTwoLowVoltage
* batteryTwoHighVoltage
