sap.ui.define([
    'com/prysoft/autotracker/controller/App.controller',
    'sap/ui/core/format/DateFormat',
    'sap/ui/model/Filter'
], function(Controller, DateFormat, Filter){
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

            //this.getView().byId('tblFuelMessages').setHeaderText(periodFormat.format(from) + ' - ' + periodFormat.format(to));
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
                var ctrl = this;
                ctrl.loadMessage(selectedUnitId, from, to).done(function(data){
                    console.log('messages: ', data);
                    oView.getModel().setProperty('/requestedMessages', data);
                }).fail(function(err){
                    console.error(err);
                    oView.getModel().setProperty('/requestedMessages', []);
                }).always(function(){
                    ctrl.executeReport(selectedUnitId, from, to, 'Сводный').done(function(tables){
                        console.log('report: ', tables);
                        var reportTabBar = oView.byId('reportTabBar');
                        while(reportTabBar.getItems().length > 1) {
                            reportTabBar.removeItem(reportTabBar.getItems().length - 1).destroyContent();
                        }
                        for (var i = 0; i < tables.length; i++) {
                            var tbl = tables[i];
                            var columns = [];
                            var rows = [];
                            for (var j = 0; j < tbl.header.length; j++) {
                                columns.push(new sap.m.Column({
                                    width : tbl.header_type[j] ? undefined : '1.5em',
                                    header: new sap.m.Label({text: tbl.header[j]})
                                }));
                                rows.push(new sap.m.Text({text:'{' + j + '}'}));
                            }
                            var oTable = new sap.m.Table(tables[i].name + '_tbl', {columns: columns});
                            oTable.bindItems('/', new sap.m.ColumnListItem({cells: rows}));
                            oTable.setModel(new sap.ui.model.json.JSONModel(tbl.values));
                            reportTabBar.addItem(new sap.m.IconTabFilter({
                                key: 'tab' + i,
                                text: tables[i].label,
                                content: [oTable]
                            }));
                        }
                    }).fail(function(err){
                        console.error(err);
                        var reportTabBar = oView.byId('reportTabBar');
                        while(reportTabBar.getItems().length > 1) {
                            reportTabBar.removeItem(reportTabBar.getItems().length - 1).destroyContent();
                        }
                    }).always(function(){
                        oView.byId('fuelChargePage').setTitle('Отчет. ' + selectedUnit.getBindingContext().getProperty('name'));
                        oView.setBusy(false);
                        oView.byId('drsPeriod').setEnabled(true);
                    });
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
        },

        formatRefuelingCardId: function(cardId, fuelCardsMap) {
            var fuelCard = fuelCardsMap[cardId];
            return fuelCard ? fuelCard.name + ' (id:' + cardId + ')' : 'id:' + cardId + ' (отсутствует в справочнике)';
        },

        onSearch : function (oEvt) {
            // add filter for search
            var aFilters = [];
            var sQuery = oEvt.getSource().getValue();
            if (sQuery && sQuery.length > 0) {
                var filter = new Filter('name', sap.ui.model.FilterOperator.Contains, sQuery);
                aFilters.push(filter);
            }

            // update list binding
            var list = this.getView().byId('unitList');
            var binding = list.getBinding('items');
            binding.filter(aFilters, 'Application');
        }
    });
});
