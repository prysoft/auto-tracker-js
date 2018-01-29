sap.ui.define([
    'com/prysoft/autotracker/controller/AbstractBaseController',
    'sap/m/MessageToast'
], function (Controller, MessageToast) {
    'use strict';

    var wialonTimeToDate = function(timeNumber) {
        try {
            var tzFormattedTime = wialon.util.DateTime.formatTime(timeNumber).replace(/^(\d{4})\-(\d{2})\-(\d{2})\s(\d{2}):(\d{2}):(\d{2})$/, '$1-$2-$3T$4:$5:$6.000+03:00');
            return new Date(Date.parse(tzFormattedTime));
        } catch(e) {
            console.warn('unable to convert wialon time to Date. Wialon value: ' + timeNumber);
            return null;
        }
    };

    var updateUnit = function(unit, position, updateTime) {
        if (!unit) {
            return;
        }

        unit.lon = position.x;
        unit.lat = position.y;
        unit.alt = position.z;
        unit.speed = position.s;
        unit.course = position.c;
        unit.satelliteCnt = position.sc;
        try {
            var tzFormattedTime = wialon.util.DateTime.formatTime(updateTime).replace(/^(\d{4})\-(\d{2})\-(\d{2})\s(\d{2}):(\d{2}):(\d{2})$/, '$1-$2-$3T$4:$5:$6.000+03:00');
            unit.lastMsgTime = new Date(Date.parse(tzFormattedTime));
        } catch(e) {
            unit.lastMsgTime = null;
        }

        return unit;
    };

    var resolveAddress = function(unit, model, modelIdx) {
        wialon.util.Gis.getLocations([{lon: unit.lon, lat: unit.lat}], (function(code, address){
            if (code) {
                console.error(wialon.core.Errors.getErrorText(code));
                return;
            }
            this.oModel.setProperty('/units/' + this.arrIdx + '/address', address);
        }).bind({oModel: model, arrIdx: modelIdx}));
    };

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
                            feature: {
                                geometry: {
                                    type: "Point",
                                    coordinates: [pos.y, pos.x]
                                },
                                properties: {
                                    id: unit.id
                                }
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

                        updateUnit(unit, pos, pos.t);
                        unit.address = '[Определение местоположения...]';
                        resolveAddress(unit, this.getView().getModel(), i);
                    } else {
                        unit.address = '[Местоположение не известно]';
                    }

                    var sensors = [];
                    var avlSensors = avlUnits[i].getSensors();
                    for(var prop in avlSensors) {
                        var avlSensor = avlSensors[prop];
                        var sensViewParams = {}; // Default values
                        try {
                            sensViewParams = JSON.parse(avlSensor.c);
                        } catch (e){}
                        var val = avlUnits[i].calculateSensorValue(avlSensor, lastMsg);
                        sensors.push({
                            id: avlSensor.id,
                            name: avlSensor.n,
                            param: avlSensor.p, // Parameter name in messages
                            type: avlSensor.t,  // Sensor type
                            measure: avlSensor.m,
                            visible: !!sensViewParams.appear_in_popup,
                            order: sensViewParams.pos || null,
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

                    var updateUnitStateOnMessage = function(msgEvt) {
                        // Updating the application model
                        var avlUnit = msgEvt.getTarget();
                        var avlUnitId = avlUnit.getId();
                        var data = msgEvt.getData();

                        var updatedUnit = null;
                        var updatedUnitIdx;
                        for (updatedUnitIdx = 0; updatedUnitIdx < units.length; updatedUnitIdx++) {
                            if (units[updatedUnitIdx].id == avlUnitId) {
                                updatedUnit = units[updatedUnitIdx];
                                break;
                            }
                        }
                        if (!updatedUnit || !data.pos) {
                            return;
                        }

                        var oModel = this.getOwnerComponent().getModel();
                        oModel.setProperty('/units/' + updatedUnitIdx, updateUnit(updatedUnit, data.pos, data.t));
                        resolveAddress(updatedUnit, oModel, updatedUnitIdx);

                        // Notifying the map
                        var oEventBus = sap.ui.getCore().getEventBus();
                        oEventBus.publish('sap.global', 'wialonMessageRegistered', {
                            unitId: avlUnitId,
                            data: data
                        });
                    };
                    avlUnits[i].addListener('messageRegistered', (updateUnitStateOnMessage).bind(this)); // register handler envoked on receiving a message
                }
                console.log(units);

                this.getView().getModel().setProperty('/units', units);
                this.getView().getModel().setProperty('/ymapGeoObjects', ymapGeoObjects);
            }).bind(this));
        },

        loadMessage: function(unitId, from, to) {
            var deferred = $.Deferred();

            if (!unitId) {
                deferred.reject('unitId is not specified');
                return deferred.promise();
            }

            var sess = wialon.core.Session.getInstance(); // get instance of current Session

            if (to) {
                to = to.getTime() / 1000; //wialon.util.DateTime.userTime|absoluteTime(to.getTime() / 1000);
            } else {
                to = sess.getServerTime(); // get ServerTime, it will be end time
            }

            if (from) {
                from = from.getTime() / 1000; //wialon.util.DateTime.userTime|absoluteTime(from.getTime() / 1000);
            } else {
                from = to - 3600*24; // get begin time ( end time - 24 hours in seconds )
            }

            var ml = sess.getMessagesLoader(); // get messages loader object for current session
            //ml.unload();
            ml.loadInterval(unitId, from, to, /* wialon.item.Item.messageFlag */ 0, /* Flag Mask */ 0, 100, function(code, data){ // load messages for given time interval
                if (code) {
                    deferred.reject('MessagesLoader#loadInterval: ' + wialon.core.Errors.getErrorText(code));
                    return;
                }

                // return empty array if no messages
                if (!data.count) { // data.count - messages count
                    deferred.resolve([]);
                    return;
                }

                console.log(data.count + ' messages loaded for specified period');

                /*ml.getMessages(0, data.count - 1, function(code, data){ // method params: first loaded msg index, last loaded msg index, callback
                    if (code) {
                        deferred.reject('MessagesLoader#getMessages: ' + wialon.core.Errors.getErrorText(code));
                        return;
                    }
                    for(var i = 0; i < data.length; i++) {
                        // Обработка
                    }
                    deferred.resolve(data);
                });*/

                /*ml.getPackedMessages(unitId, from, to, 'p.refueling*', function(code, data){ //get messages data for given indicies
                    if (code) {
                        deferred.reject('MessagesLoader#getPackedMessages: ' + wialon.core.Errors.getErrorText(code));
                        return;
                    }
                    for(var i = 0; i < data.length; i++) {
                        // Обработка
                    }
                    deferred.resolve(data);
                });*/

                var rc = wialon.core.Remote.getInstance(); // get instance of remote connection
                rc.remoteCall('messages/get_messages', {
                    timeFrom: from,
                    timeTo: to,
                    filter: 'p.refueling_*',
                    flags: 0,
                    flagsMask: 0
                }, function(code, data){
                    if (code) {
                        deferred.reject('Remote#remoteCall("messages/get_messages"): ' + wialon.core.Errors.getErrorText(code));
                        return;
                    }

                    var result = [];
                    for(var i = 0; i < data.length; i++) {
                        for (var prop in data[i].p) {
                            if (prop.indexOf('refueling_') > -1) {
                                data[i].t = wialonTimeToDate(data[i].t);
                                result.push(data[i]);
                                break;
                            }
                        }
                    }

                    deferred.resolve(result);
                });

            });

            return deferred.promise();
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
                    setTimeout((function(){
                        //this.getView().byId('auth-remote').$()[0].contentWindow.history.back();
                        // Удаляем объекты с карты
                        this.getOwnerComponent().getModel().setProperty('/ymapGeoObjects', null);
                    }).bind(this), 700); // TODO Привязка к завершению анимации
                }).bind(this));
            }
        }
    });
});
