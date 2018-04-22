sap.ui.define([
    'com/prysoft/autotracker/controller/Home.controller',
    'jquery.sap.global'
], function(Controller, $){
    'use strict';

    var getUnitIdxById = function(units, unitId) {
        for (var i = 0; i < units.length; i++) {
            if (units[i].id == unitId) {
                return i;
            }
        }
    };

    var getUnitsProperty = function(oView){
        var deferred = $.Deferred();

        var oModel = oView.getModel();
        var units = oModel && oModel.getProperty('/units');
        if (units) {
            deferred.resolve(units);
        } else {
            setTimeout(function(){
                var oModel = oView.getModel();
                var units = oModel && oModel.getProperty('/units');
                if (units) {
                    deferred.resolve(units);
                } else {
                    var binding = oModel.bindProperty('/units', oModel.getContext('/units'));
                    var propertyChangeHandler = function (oEvt) {
                        binding.detachChange(propertyChangeHandler);
                        deferred.resolve(oModel.getProperty('/units'));
                    };
                    binding.attachChange(propertyChangeHandler);
                }
            });
        }
        return deferred.promise();
    };

    return Controller.extend('com.prysoft.autotracker.controller.UnitState', {
        onInit: function(){
            console.log('UNIT_STATE_INIT');

            this.getRouter().getRoute('unitState').attachMatched(function(oEvt){
                var unitId = oEvt.getParameter('arguments').unitId;

                var oView = this.getView();
                getUnitsProperty(oView).done(function(units){
                    var unitIdx = getUnitIdxById(units, unitId);
                    oView.bindElement('/units/' + unitIdx);

                    setTimeout(function(){
                        oView.getParent().getParent().getParent().byId('unitMap').panTo(unitId);
                    }, 300);
                });
            }, this);
        },

        formatFuelReceiver: function(sensor) {
            if (sensor.param == 'refueling_card_id') {
                var map = this.getFuelCardsMap();
                return map && (sensor.value in map) ? map[sensor.value].name : 'id:' + sensor.value;
            }
        }
    });
});
