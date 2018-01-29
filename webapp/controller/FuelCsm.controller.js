sap.ui.define([
    'com/prysoft/autotracker/controller/App.controller'
], function(Controller){
    'use strict';

    var selectedUnit;

    return Controller.extend('com.prysoft.autotracker.controller.FuelCsm', {
        onInit: function(){
            console.log('FUEL_CONSUMPTION_INIT');

            setTimeout((function(){
                var cmbPeriod = this.getView().byId('cmbPeriod');
                cmbPeriod.setSelectedItem(cmbPeriod.getFirstItem());
            }).bind(this));
        },

        _requestMessages: function() {
            if (selectedUnit) {
                var cmbPeriod = this.getView().byId('cmbPeriod');
                var selectedItem = cmbPeriod.getSelectedItem();
                console.log('Selected item: ' + selectedItem.getKey() + ' -> ' + selectedItem.getText());

                var selectedUnitId = selectedUnit.getBindingContext().getProperty('id');

                var oView = this.getView();
                oView.setBusy(true);
                this.loadMessage(selectedUnitId, new Date('2018-01-01'), new Date('2018-01-29')).done(function(data){
                    console.log(data);
                    oView.getModel().setProperty('/requestedMessages', data);
                }).fail(function(err){
                    console.error(err);
                    oView.getModel().setProperty('/requestedMessages', []);
                }).always(function(){
                    oView.byId('fuelChargePage').setTitle('Заправки. ' + selectedUnit.getBindingContext().getProperty('name'));
                    oView.setBusy(false);
                });
            }
        },

        selectAuto: function(oEvt) {
            selectedUnit = oEvt.getParameter('listItem');
            this._requestMessages();
        },

        cmbPeriodChange: function(oEvt) {
            //var selectedItem = oEvt.getParameter('selectedItem');
            this._requestMessages();
        },

        getMsgGroup: function(oContext) {
            var cardId = oContext.getProperty('p/refueling_card_id');
            var name = this.getView().getModel().getProperty('/fuelCardsMap/' + cardId + '/name');
            return {
                key: cardId,
                title: 'Получатель: ' + (name ? name  + ' (карта: ' + cardId + ')': cardId + ' (Ф.И.О. отсутствует в справочнике)')
            };
        },

        getMsgGroupHeader: function(oGroup) {
            return new sap.m.GroupHeaderListItem({
                title: oGroup.title,
                upperCase: false
            });
        }
    });
});
