sap.ui.define([
    'com/prysoft/autotracker/controller/App.controller',
    'sap/m/MessageToast'
], function(Controller, MessageToast){
    'use strict';

    return Controller.extend('com.prysoft.autotracker.controller.AppTools', {
        onInit: function(){
            console.log('APPTOOLS_INIT');
        },

        showTempToast: function(oEvent) {
            var item = oEvent.getParameter('item');
            if (item.getId().indexOf('mnAuto') < 0) {
                MessageToast.show('Раздел "' + item.getText() + '" временно недоступен');
            }
        }
    });
});
