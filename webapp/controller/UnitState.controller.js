sap.ui.define([
    'com/prysoft/autotracker/controller/Home.controller'
], function(Controller){
    'use strict';

    return Controller.extend('com.prysoft.autotracker.controller.UnitState', {
        onInit: function(){
            console.log('UNIT_STATE_INIT');
            this.getRouter().getRoute('unitState').attachMatched(function(oEvt){
                this.getView().bindElement('/units/' + oEvt.getParameter('arguments').unitIdx);
            }, this);
        }
    });
});
