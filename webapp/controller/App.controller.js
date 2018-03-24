sap.ui.define([
    'com/prysoft/autotracker/controller/AbstractBaseController',
    'sap/m/MessageToast',
    'jquery.sap.global'
], function (Controller, MessageToast, $) {
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

        _saveAvlResources: function(avlResources) {
            if (!avlResources) {
                console.warn('avl_resource: ', 'No resources loaded');
                return;
            }

            console.log('avl_resource: ', avlResources);

            var resources = [];
            for (var i = 0; i < avlResources.length; i++) {
                var resource = {
                    id: avlResources[i].getId(),
                    name: avlResources[i].getName(),
                    execReports: !!wialon.util.Number.and(avlResources[i].getUserAccess(), wialon.item.Item.accessFlag.execReports)
                };

                var repTempls = [];
                var avlTemplates = avlResources[i].getReports();
                for(var prop in avlTemplates){
                    var avlTemplate = avlTemplates[prop];
                    repTempls.push({
                        id: avlTemplate.id,
                        name: avlTemplate.n,
                        type: avlTemplate.ct
                        // avlTemplate.c ?
                    });
                }
                resource.repTempls = repTempls;
                resources.push(resource);
            }
            console.log('resources: ', resources);

            this.getView().getModel().setProperty('/resources', resources);
        },

        _saveAvlUnits: function(avlUnits) {
            if (!avlUnits) {
                console.warn('avl_unit: ', 'No units loaded');
                return;
            }

            console.log('avl_unit: ', avlUnits);

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
            console.log('units: ', units);

            this.getView().getModel().setSizeLimit(units.length > 100 ? units.length : 100);
            this.getView().getModel().setProperty('/units', units);
            this.getView().getModel().setProperty('/ymapGeoObjects', ymapGeoObjects);
        },

        loadAvlData: function(){
            var sess = wialon.core.Session.getInstance();

            // specify what kind of data should be returned for avl resources
            var resourceFlags = wialon.util.Number.or(
                wialon.item.Item.dataFlag.base,
                wialon.item.Resource.dataFlag.drivers,
                wialon.item.Resource.dataFlag.driverUnits,
                wialon.item.Resource.dataFlag.reports);

            sess.loadLibrary("resourceDrivers");
            sess.loadLibrary("resourceReports"); // load Reports Library
            //---------------------------------------------------------------

            // specify what kind of data should be returned for avl units
            var unitFlags = wialon.util.Number.or(
                wialon.item.Item.dataFlag.base,
                wialon.item.Unit.dataFlag.sensors,
                wialon.item.Unit.dataFlag.lastMessage);

            sess.loadLibrary("itemIcon");
            sess.loadLibrary("unitSensors"); // load Sensor Library
            //---------------------------------------------------------------

            sess.updateDataFlags([
                {type: "type", data: "avl_resource", flags: resourceFlags , mode: 0},
                {type: "type", data: "avl_unit", flags: unitFlags, mode: 0}
            ], (function (code) {
                if (code) {
                    console.error(wialon.core.Errors.getErrorText(code));
                    return;
                }

                // Saving resources
                this._saveAvlResources(sess.getItems('avl_resource'));

                // Saving units
                this._saveAvlUnits(sess.getItems('avl_unit'));
            }).bind(this));
        },

        _convertPeriodDatesToTime: function(from, to) {
            var sess = wialon.core.Session.getInstance(); // get instance of current Session

            if (to) {
                to = Math.floor(to.getTime() / 1000); //wialon.util.DateTime.userTime|absoluteTime(to.getTime() / 1000);
            } else {
                to = sess.getServerTime(); // get ServerTime, it will be end time
            }

            if (from) {
                from = Math.floor(from.getTime() / 1000); //wialon.util.DateTime.userTime|absoluteTime(from.getTime() / 1000);
            } else {
                from = to - 3600*24; // get begin time ( end time - 24 hours in seconds )
            }

            return {fromTime: from, toTime: to};
        },

        loadMessage: function(unitId, from, to) {
            var deferred = $.Deferred();

            if (!unitId) {
                deferred.reject('unitId is not specified for messages');
                return deferred.promise();
            }

            var period = this._convertPeriodDatesToTime(from, to);
            from = period.fromTime;
            to = period.toTime;

            var sess = wialon.core.Session.getInstance(); // get instance of current Session

            var ml = sess.getMessagesLoader(); // get messages loader object for current session
            //ml.unload();
            ml.loadInterval(unitId, from, to, /* wialon.item.Item.messageFlag */ 0, /* Flag Mask */ 0, 100, function(code, data){ // load messages for given time interval
                if (code) {
                    deferred.reject('MessagesLoader#loadInterval: ' + wialon.core.Errors.getErrorText(code));
                    return;
                }

                console.log(data.count + ' messages loaded for specified period');

                // return empty array if no messages
                if (!data.count) { // data.count - messages count
                    deferred.resolve([]);
                    return;
                }

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
                            if (prop.indexOf('refueling_amount') > -1 && data[i].p.refueling_amount) { // Отсекаем нулевые значения
                                //if (result.length == 9){data[i].p.refueling_amount = 300.00;data[i].p.refueling_card_id = 322591;}
                                data[i].t = wialonTimeToDate(data[i].t);

                                var dt = new Date(data[i].t.getTime());
                                dt.setHours(0, 0, 0, 0);
                                data[i].dt = dt;

                                 // Суммирование израсходованного топлива
                                /*var lastElem = result.length && result[result.length - 1];
                                //if (result.length == 9){console.log(lastElem, data[i], dt);}
                                if (lastElem && lastElem.p.refueling_card_id === data[i].p.refueling_card_id && lastElem.t.getTime() === dt.getTime()) {
                                    lastElem.group.push(data[i]);
                                    lastElem.p.refueling_amount += data[i].p.refueling_amount;
                                } else {
                                    var cpy = $.extend(true, {}, data[i]);
                                    cpy.t = dt;
                                    cpy.group = [data[i]];
                                    result.push(cpy);
                                }*/
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

        executeReport: function(unitId, from, to, template, resource) {
            var deferred = $.Deferred();

            if (!unitId) {
                deferred.reject('unitId is not specified for report');
                return deferred.promise();
            }

            if (!template) {
                deferred.reject('template id or name is not specified for report');
                return deferred.promise();
            }

            var sess = wialon.core.Session.getInstance();

            var avlResource = null;
            var avlTemplateId = null;
            if (resource === parseInt(resource, 10)) {
                avlResource = sess.getItem(resource);
            } else if (Object.prototype.toString.call(resource) === '[object String]') {
                var avlResources = sess.getItems("avl_resource");
                if (avlResources) {
                    for (var i = 0; i < avlResources.length; i++) {
                        if (resource == avlResources[i].getName()) {
                            avlResource = avlResources[i];
                            break;
                        }
                    }
                }
            } else if (Object.prototype.toString.call(resource) === '[object Undefined]') {
                var tplId = (template === parseInt(template, 10)) ? template : null;
                var tplName = (Object.prototype.toString.call(template) === '[object String]') ? template : null;
                var avlResources = sess.getItems("avl_resource");
                if (avlResources) {
                    avlResourceLoop1:
                    for (var i = 0; i < avlResources.length; i++) {
                        var avlTemplates = avlResources[i].getReports() || {};
                        if (avlTemplates[tplId]) {
                            avlTemplateId = tplId;
                            avlResource = avlResources[i];
                            break;
                        }
                        avlResourceLoop2:
                        for (var prop in avlTemplates) {
                            if (avlTemplates[prop].n === tplName) {
                                avlTemplateId = avlTemplates[prop].id;
                                avlResource = avlResources[i];
                                break avlResourceLoop1;
                            }
                        }
                    }
                }
            }

            if (!avlResource) {
                deferred.reject('no resource containing report template "' + template + '"');
                return deferred.promise();
            }
            console.log('avlResource for report: ', avlResource.getName());

            var avlTemplate = null;
            if (avlTemplateId) {
                avlTemplate = avlResource.getReport(avlTemplateId);
            } else if (template === parseInt(template, 10)) {
                avlTemplate = avlResource.getReport(template);
            } else if (Object.prototype.toString.call(template) === '[object String]') {
                var avlTemplates = avlResource.getReports() || {};
                for (var prop in avlTemplates) {
                    if (avlTemplates[prop].n === template) {
                        avlTemplate = avlResource.getReport(avlTemplates[prop].id);
                        break;
                    }
                }
            }
            if (!avlTemplate) {
                deferred.reject('unable to find template: ' + template);
                return deferred.promise();
            }
            console.log('avlTemplate for report: ', avlTemplate.n);

            var period = this._convertPeriodDatesToTime(from, to);
            from = period.fromTime;
            to = period.toTime;
            var reportInterval = {from: from, to: to, flags: wialon.item.MReport.intervalFlag.absolute };

            avlResource.execReport(avlTemplate, unitId, 0, reportInterval, function(code, data) { // execReport template
                if (code) {
                    deferred.reject('avlResource#execReport: ' + wialon.core.Errors.getErrorText(code));
                    return;
                }
                var tables = data.getTables() || [];
                if (!tables.length) {
                    deferred.resolve(tables);
                    return;
                }
                var tblsWithDataCnt = 0;
                for(var i = 0; i < tables.length; i++) {
                    var tbl = tables[i];
                    data.getTableRows(i, 0, tbl.rows, (function(i, tbl, code, rows){
                        var numCols = {};
                        for (var hti = 0; hti < tbl.header_type.length; hti++) {
                            var headerType = tbl.header_type[hti];
                            if (/^(fuel_level_begin|filled|mileage|fuel_consumption_fls|avg_fuel_consumption_fls|avg_speed|max_speed)$/.test(headerType)) {
                                numCols[hti] = null;
                            }
                        }

                        var rowValues = [];
                        var columnSizes = new Array(tbl.columns);
                        if (code) {
                            console.warn('data#getTableRows: ', wialon.core.Errors.getErrorText(code));
                        } else {
                            if (rows) {
                                for (var j = 0; j < rows.length; j++) {
                                    if (!rows[j].c) {
                                        continue;
                                    }
                                    var cellValues = [];
                                    for (var k = 0; k < rows[j].c.length; k++) {
                                        var cellValue = rows[j].c[k];
                                        if (typeof cellValue == 'object') {
                                            cellValue = (typeof cellValue.t == 'string') ? cellValue.t : undefined;
                                        }
                                        if (k < columnSizes.length && typeof cellValue == 'string') {
                                            columnSizes[k] = Math.max(columnSizes[k] || 0, cellValue.length);
                                        }
                                        if (typeof cellValue == 'string' && k in numCols) {
                                            var cellNumValue = cellValue.replace(/^\s*(\d[\d.]*)\s*[^$]*/g, '$1');
                                            if (!isNaN(cellNumValue)) {
                                                cellValue = parseFloat(cellNumValue);
                                            }
                                        }
                                        cellValues.push(cellValue);
                                    }
                                    if (cellValues.length) {
                                        rowValues.push(cellValues);
                                    }
                                }
                            }
                        }
                        tbl.values = rowValues;
                        tbl.columnSizes = columnSizes;
                        if (++tblsWithDataCnt >= tables.length) {
                            deferred.resolve(tables);
                        }
                    }).bind(null, i, tbl));
                }
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
                        this.getOwnerComponent().getModel().setProperty('/requestedMessages', null);
                    }).bind(this), 700); // TODO Привязка к завершению анимации
                }).bind(this));
            }
        }
    });
});
