sap.ui.define([
    'com/prysoft/autotracker/controller/App.controller'
], function(Controller){
    'use strict';

    return Controller.extend('com.prysoft.autotracker.controller.Home', {
        onInit: function(){
            console.log('HOME_INIT');
        }
    });
});
