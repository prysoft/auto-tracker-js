sap.ui.define([
    'com/prysoft/autotracker/controller/App.controller'
], function(Controller){
    'use strict';

    return Controller.extend('com.prysoft.autotracker.controller.Home', {
        onInit: function(){
            console.log('HOME_INIT');
        },

        locateMe: function(oEvent) {
            console.log('onListItemPress', oEvent.getParameter('listItem').data('params'));
            //var sToPageId = oEvent.getParameter('listItem').getCustomData()[0].getValue();

            this.byId('autoSplit').toDetail(this.createId('autoSplitDetail'));
        },

        backToMaster: function(oEvent) {
            this.byId('autoSplit').backMaster();
        }
    });
});
