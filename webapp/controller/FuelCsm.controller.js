sap.ui.define([
    'com/prysoft/autotracker/controller/App.controller',
    'sap/ui/core/format/DateFormat',
    'sap/ui/model/Filter',
    'jquery.sap.global'
], function(Controller, DateFormat, Filter, $){
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

                var dLoadMsg = $.Deferred();
                this.loadMessage(selectedUnitId, from, to).done(function(messages){
                    console.log('messages: ', messages);
                    dLoadMsg.resolve(messages);
                }).fail(function(err){
                    console.error(err);
                    dLoadMsg.resolve([]);
                });

                var dExecRep = $.Deferred();
                this.executeReport(selectedUnitId, from, to, 'Сводный').done(function(tables){
                    console.log('report: ', tables);
                    dExecRep.resolve(tables);
                }).fail(function(err){
                    console.error(err);
                    dExecRep.resolve([]);
                });

                var oCtrl = this;
                $.when(dLoadMsg, dExecRep).done(function(messages, tables){

                    var reportTabBar = oView.byId('reportTabBar');
                    while(reportTabBar.getItems().length > 0) {
                        reportTabBar.removeItem(reportTabBar.getItems().length - 1).destroyContent();
                    }

                    if (messages.length) {
                        var fuelChargesTab = sap.ui.xmlfragment("com.prysoft.autotracker.view.FuelCharges", oCtrl);
                        reportTabBar.addItem(fuelChargesTab);
                    }

                    for (var i = 0; i < tables.length; i++) {
                        var tbl = tables[i];
                        // Временно скрываем сводку
                        if (tbl.name === 'unit_generic') {
                            continue;
                        }
                        // Merge data with fuel charge report
                        if (tbl.name === 'unit_thefts' && messages.length) {
                            for (var k = 0; k < tbl.values.length; k++) {
                                var time = Date.parse(tbl.values[k][1]);
                                var t = new Date(time);
                                var dt = new Date(time);
                                dt.setHours(0, 0, 0, 0);
                                messages.push({ t: t, dt: dt, theft_amount: (tbl.values[k][3]).replace(/([^\d^.]+)/g, ''), theft_place: tbl.values[k][2] });
                            }
                            continue;
                        }
                        var hdrColumns = [];
                        var columns = [];
                        var rows = [];
                        for (var j = 0; j < tbl.header.length; j++) {
                            var colConfig = { width : tbl.header_type[j] ? undefined : '1.5em' };
                            columns.push(new sap.m.Column(colConfig));
                            hdrColumns.push(new sap.m.Column($.extend({header: new sap.m.Label({text: tbl.header[j]})}, colConfig)));
                            rows.push(new sap.m.Text({text:'{' + j + '}'}));
                        }
                        var oTableHeader = new sap.m.Table(tbl.name + '_tbl_hdr', {columns: hdrColumns, showNoData: false});
                        var oTable = new sap.m.Table(tbl.name + '_tbl', {columns: columns});
                        oTable.bindItems('/', new sap.m.ColumnListItem({cells: rows}));
                        oTable.setModel(new sap.ui.model.json.JSONModel(tbl.values));
                        reportTabBar.addItem(new sap.m.IconTabFilter({
                            key: 'tab_' + tbl.name,
                            text: tbl.label,
                            content: [
                                oTableHeader,
                                new sap.m.ScrollContainer({
                                    height: 'calc(100% - 3rem)',
                                    width: '100%',
                                    horizontal: false,
                                    vertical: true,
                                    content: [oTable]
                                })
                            ]
                        }));
                    }
                    // reportTabBar.setSelectedKey(); // will select the first tab if no arguments are passed. If tab was folded by user, it will NOT be unfolded.
                    // Another way to select tab by its index. If tab was folded by user, it WILL be unfolded.
                    var tbItems = reportTabBar.getItems();
                    if (tbItems.length) {
                       reportTabBar.setSelectedItem(tbItems[0]);
                    }

                    oView.getModel().setProperty('/requestedMessages', messages);
                }).always(function(){
                    oView.byId('fuelChargePage').setTitle('Отчет. ' + selectedUnit.getBindingContext().getProperty('name'));
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
                key: date && date.getTime(),
                title: date && dateFormat.format(date)
            };
        },

        getMsgGroupHeader: function(oGroup) {
            return new sap.m.GroupHeaderListItem({
                title: oGroup.title,
                upperCase: false
            });
        },

        formatRefuelingCardId: function(theftPlace, cardId, fuelCardsMap) {
            if (theftPlace !== undefined) {
                return 'Слив: ' + theftPlace;
            }
            if (cardId === undefined) {
                return '---';
            }
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
