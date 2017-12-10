sap.ui.define([
    'com/prysoft/autotracker/controller/App.controller'
], function(Controller){
    'use strict';

    return Controller.extend('com.prysoft.autotracker.controller.TechState', {
        onInit: function(){
            console.log('TECHSTATE_INIT');
        }
    });
});
