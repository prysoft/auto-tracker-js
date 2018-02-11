sap.ui.define([
    'com/prysoft/autotracker/controller/App.controller',
    'sap/ui/core/format/DateFormat'
], function(Controller, DateFormat){
    'use strict';

    var periodFormat = DateFormat.getInstance({
        pattern: 'dd.MM.yy HH:mm'
    });
    var dateFormat = DateFormat.getInstance({
        pattern: 'dd MMM yyyy'
    });

    var selectedUnit;

    return Controller.extend('com.prysoft.autotracker.controller.FuelCsm', {
        onInit: function(){
            console.log('FUEL_CONSUMPTION_INIT');

            setTimeout((function(){
                var cmbPeriod = this.getView().byId('cmbPeriod');
                cmbPeriod.setSelectedItem(cmbPeriod.getFirstItem());
                var period = this._getPeriodDates();
                if (period) {
                    this.getView().byId('tblFuelMessages').setHeaderText(periodFormat.format(period[0]) + ' - ' + periodFormat.format(period[1]));
                } else {
                    this.getView().byId('tblFuelMessages').setHeaderText('Период не установлен');
                }
            }).bind(this));

            this.getView().setBusyIndicatorDelay(300);
        },

        _getPeriodDates: function() {
            var cmbPeriod = this.getView().byId('cmbPeriod');
            var selectedItem = cmbPeriod.getSelectedItem();
            var cmbPeriodKey = selectedItem.getKey(); //selectedItem.getText());
            var from = new Date();
            var to;
            switch(cmbPeriodKey) {
                case 't':
                    to = new Date(from.getTime());
                    from.setHours(0,0,0,0);
                    break;
                case 'y':
                    from.setDate(from.getDate() - 1);
                    from.setHours(0,0,0,0);
                    to = new Date(from.getTime());
                    to.setHours(23,59,59,0);
                    break;
                case 'w':
                    to = new Date(from.getTime());
                    from.setDate(to.getDate() - (to.getDay() + 6) % 7);
                    break;
                case 'm':
                    to = new Date(from.getTime());
                    from.setDate(1);
                    from.setHours(0,0,0,0);
                    break;
                default:
                    console.warn('Unknown period value: ' + cmbPeriodKey);
                    return null;
            }
            return [from, to];
        },

        _requestMessages: function() {
            if (selectedUnit) {
                var period = this._getPeriodDates();
                if (!period) {
                    return;
                }
                var from = period[0], to = period[1];

                var selectedUnitId = selectedUnit.getBindingContext().getProperty('id');

                var oView = this.getView();
                oView.setBusy(true);
                this.loadMessage(selectedUnitId, from, to).done(function(data){
                    console.log(data);
                    oView.getModel().setProperty('/requestedMessages', data);
                }).fail(function(err){
                    console.error(err);
                    oView.getModel().setProperty('/requestedMessages', []);
                }).always(function(){
                    oView.byId('fuelChargePage').setTitle('Заправки. ' + selectedUnit.getBindingContext().getProperty('name'));
                    oView.setBusy(false);
                    oView.byId('cmbPeriod').setEnabled(true);
                });
            }
        },

        selectAuto: function(oEvt) {
            selectedUnit = oEvt.getParameter('listItem');
            this._requestMessages();
        },

        cmbPeriodChange: function(oEvt) {
            //var selectedItem = oEvt.getParameter('selectedItem');
            var period = this._getPeriodDates();
            if (period) {
                this.getView().byId('tblFuelMessages').setHeaderText(periodFormat.format(period[0]) + ' - ' + periodFormat.format(period[1]));
            } else {
                this.getView().byId('tblFuelMessages').setHeaderText('Период не установлен');
            }
            this._requestMessages();
        },

        getMsgGroup: function(oContext) {
            var date = oContext.getProperty('dt');
            return {
                key: date.getTime(),
                title: date && dateFormat.format(date)
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
