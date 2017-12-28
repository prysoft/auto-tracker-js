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
                wialon.item.Unit.dataFlag.lastMessage);

            sess.loadLibrary("itemIcon");

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

                var units = [];
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

                    units.push(unit);
                }
                console.log(units);

                this.getView().getModel().setProperty('/units', units);
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
