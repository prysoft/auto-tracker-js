sap.ui.define([
    'com/prysoft/autotracker/controller/Home.controller'
], function(Controller){
    'use strict';

    return Controller.extend('com.prysoft.autotracker.controller.UnitList', {
        onInit: function(){
            console.log('UNIT_LIST_INIT');
        }
    });
});
