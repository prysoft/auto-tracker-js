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

            var drsPeriod = this.getView().byId('drsPeriod');
            drsPeriod.setDateValue(new Date());
            drsPeriod.setSecondDateValue(new Date());
            this._getPeriodDates();

            drsPeriod.onAfterRendering = function() {
                if (sap.m.DateRangeSelection.prototype.onAfterRendering) {
                    sap.m.DateRangeSelection.prototype.onAfterRendering.apply(this);
                }
                document.getElementById(drsPeriod.sId + '-inner').disabled = true;
            };

            this.getView().setBusyIndicatorDelay(300);
        },

        _getPeriodDates: function() {
            /*var from = new Date();
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
            }*/

            var drsPeriod = this.getView().byId('drsPeriod');
            if (drsPeriod.getValueState() != sap.ui.core.ValueState.None) {
                console.warn('Date period is invalid');
                return null;
            }
            var from = drsPeriod.getDateValue();
            if (!from) {
                console.warn('begin date is not defined');
                return null;
            }
            from.setHours(0,0,0,0);
            var to = drsPeriod.getSecondDateValue();
            if (!to) {
                console.warn('end date is not defined');
                return null;
            }
            to.setHours(23,59,59,999);

            this.getView().byId('tblFuelMessages').setHeaderText(periodFormat.format(from) + ' - ' + periodFormat.format(to));
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
                    oView.byId('drsPeriod').setEnabled(true);
                });
            }
        },

        selectAuto: function(oEvt) {
            selectedUnit = oEvt.getParameter('listItem');
            this._requestMessages();
        },

        drsPeriodChange: function(oEvt) {
            var drsPeriod = oEvt.oSource;
            var isValid = oEvt.getParameter("valid");
            var from = oEvt.getParameter("from");
            var to = oEvt.getParameter("to");
            if (isValid && from && to) {
                drsPeriod.setValueState(sap.ui.core.ValueState.None);
            } else {
                drsPeriod.setValueState(sap.ui.core.ValueState.Error);
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
