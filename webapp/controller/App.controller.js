sap.ui.define([
    'com/prysoft/autotracker/controller/AbstractBaseController',
    'sap/m/MessageToast'
], function (Controller, MessageToast) {
    'use strict';

    return Controller.extend('com.prysoft.autotracker.controller.App', {
        onInit: function(){
            console.log('APP_INIT');
        },

        loadAvlResources: function(){
            var sess = wialon.core.Session.getInstance(); // get instance of current Session

            // specify what kind of data should be returned
            var flags = wialon.util.Number.or(
                wialon.item.Item.dataFlag.base,
                wialon.item.Resource.dataFlag.drivers,
                wialon.item.Resource.dataFlag.driverUnits);

            sess.loadLibrary("resourceDrivers");

            // load items to current session
            sess.updateDataFlags([{type: "type", data: "avl_resource", flags: flags, mode: 0}], (function(code){
                if (code) { // exit if error code
                    console.error(wialon.core.Errors.getErrorText(code));
                    return;
                }

                var avlResources = sess.getItems("avl_resource");
                console.log(avlResources);
            }).bind(this));
        },

        loadAvlUnits: function(){
            var sess = wialon.core.Session.getInstance();

            var flags = wialon.util.Number.or(
                wialon.item.Item.dataFlag.base,
                wialon.item.Unit.dataFlag.sensors,
                wialon.item.Unit.dataFlag.lastMessage);

            sess.loadLibrary("itemIcon");
            sess.loadLibrary("unitSensors"); // load Sensor Library

            sess.updateDataFlags([{type: "type", data: "avl_unit", flags: flags, mode: 0}], (function (code) {
                if (code) {
                    console.error(wialon.core.Errors.getErrorText(code));
                    return;
                }

                var avlUnits = sess.getItems("avl_unit");
                if (!avlUnits || !avlUnits.length) {
                    console.warn("No units loaded");
                    return;
                }

                console.log(avlUnits);

                //var timeZoneOffsetSeconds = new Date().getTimezoneOffset() * 60;
                var units = [];
                var ymapGeoObjects = [];
                for (var i = 0; i < avlUnits.length; i++) {
                    //var unit = sess.getItem(units[i].getId()); // get unit by id
                    var unit = {
                        id: avlUnits[i].getId(),
                        name: avlUnits[i].getName(),
                        icon: avlUnits[i].getIconUrl(32),
                        iconS: avlUnits[i].getIconUrl(16)
                    };

                    var lastMsg = avlUnits[i].getLastMessage();
                    if (lastMsg) {
                        // lastMsg.i; // входящие данные
                        // lastMsg.p; // параметры
                        // lastMsg.tp; // Тип сообщения
                        var typeDesc;
                        switch(lastMsg.tp) {
                            case 'ud':
                                typeDesc = 'сообщение с данными';
                                unit.isAlarm = !!(unit.f & 16);
                                break;
                            case 'us': typeDesc = 'SMS сообщение'; break;
                            case 'ucr': typeDesc = 'команда'; break;
                            case 'evt': typeDesc = 'событие'; break;
                        }
                        unit.typeDesc = typeDesc;
                    }

                    var pos = avlUnits[i].getPosition();
                    if (pos) {
                        // ymaps data begin ------------
                        ymapGeoObjects.push({
                            type: 'Feature',
                            id: unit.id,
                            geometry: {
                                type: "Point",
                                coordinates: [pos.y, pos.x]
                            },
                            options: {
                                iconLayout: 'default#image',
                                // Своё изображение иконки метки.
                                iconImageHref: unit.icon,
                                // Размеры метки.
                                iconImageSize: [32, 32],
                                // Смещение левого верхнего угла иконки относительно
                                // её "ножки" (точки привязки).
                                iconImageOffset: [-16, -16]
                            }
                        });
                        // ymaps data end --------------

                        unit.lon = pos.x;
                        unit.lat = pos.y;
                        unit.alt = pos.z;
                        unit.speed = pos.s;
                        unit.course = pos.c;
                        unit.satelliteCnt = pos.sc;
                        try {
                            var tzFormattedTime = wialon.util.DateTime.formatTime(pos.t).replace(/^(\d{4})\-(\d{2})\-(\d{2})\s(\d{2}):(\d{2}):(\d{2})$/, '$1-$2-$3T$4:$5:$6.000+03:00');
                            unit.lastMsgTime = new Date(Date.parse(tzFormattedTime));
                        } catch(e) {
                            unit.lastMsgTime = null;
                        }
                        unit.address = '[Определение местоположения...]';
                        wialon.util.Gis.getLocations([{lon: pos.x, lat: pos.y}], (function(code, address){
                            if (code) {
                                console.error(wialon.core.Errors.getErrorText(code));
                                return;
                            }
                            this.oModel.setProperty('/units/' + this.arrIdx + '/address', address);
                        }).bind({oModel: this.getView().getModel(), arrIdx: i}));
                    } else {
                        unit.address = '[Местоположение не известно]';
                    }

                    var sensors = [];
                    var avlSensors = avlUnits[i].getSensors();
                    for(var prop in avlSensors) {
                        var avlSensor = avlSensors[prop];
                        var val = avlUnits[i].calculateSensorValue(avlSensor, lastMsg);
                        sensors.push({
                            id: avlSensor.id,
                            name: avlSensor.n,
                            measure: avlSensor.m, // TODO correct according to avlSensor.t
                            value: val == wialon.item.MUnitSensor.invalidValue ? null : val
                        });
                    }

                    var lastMsgUnitsFn = function(sensors) {
                        return function(code, data){
                            if (code) {
                                console.error(wialon.core.Errors.getErrorText(code));
                                return;
                            }
                            for (var i = 0; i < sensors.length; i++) {
                                if (sensors[i].id in data) {
                                    var val = data[sensors[i].id];
                                    sensors[i].value = val == wialon.item.MUnitSensor.invalidValue ? null : val;
                                }
                            }
                        }
                    };
                    var rc = wialon.core.Remote.getInstance(); // get instance of remote connection
                    rc.remoteCall('unit/calc_last_message', {
                        unitId: unit.id,
                        flags: 1
                    }, lastMsgUnitsFn(sensors));

                    unit.sensors = sensors;

                    units.push(unit);
                }
                console.log(units);

                this.getView().getModel().setProperty('/units', units);
                this.getView().getModel().setProperty('/ymapGeoObjects', ymapGeoObjects);
            }).bind(this));
        },

        onExitPress: function() {
            var user = wialon.core.Session.getInstance().getCurrUser();
            if (user){ // if user logged in - logout
                wialon.core.Session.getInstance().logout((function (code) {
                    if (code) {
                        console.error(wialon.core.Errors.getErrorText(code));
                    }
                    this.removeCookie('access_token', '/');
                    this.getOwnerComponent().setAuthorized(false);
                    /*setTimeout((function(){
                        this.getView().byId('auth-remote').$()[0].contentWindow.history.back();
                    }).bind(this), 0);*/
                }).bind(this));
            }
        }
    });
});
