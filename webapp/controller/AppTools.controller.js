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
            var item = oEvent.getParameter('item'); // returns tnt:NavigationListItem
            var routeName = item.data('params');
            if (!routeName || routeName.indexOf('start') < 0 && routeName.indexOf('techState') < 0) {
                MessageToast.show('Раздел "' + item.getText() + '" временно недоступен');
                return;
            }

            this.getRouter().navTo(routeName);
        }
    });
});
