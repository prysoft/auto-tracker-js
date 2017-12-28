sap.ui.define([
    'com/prysoft/autotracker/controller/App.controller'
], function(Controller){
    'use strict';

    return Controller.extend('com.prysoft.autotracker.controller.Home', {
        onInit: function(){
            console.log('HOME_INIT');
        },

        goToInfo: function(oEvent) {
            var oItem = oEvent.getParameter('listItem');
            this.getRouter().navTo("unitState",{
                //unitIdx : oItem.getParent().indexOfItem(oItem)
                unitId: oItem.getBindingContext().getProperty('id')
            });
        },

        locateMe: function(oEvent) {
            console.log('onListItemPress', oEvent.getParameter('listItem').data('params'));
            //var sToPageId = oEvent.getParameter('listItem').getCustomData()[0].getValue();

            this.byId('autoSplit').toDetail(this.createId('autoSplitDetailMap'));
        },

        backToMaster: function(oEvent) {
            this.byId('autoSplit').backMaster();
        }
    });
});
