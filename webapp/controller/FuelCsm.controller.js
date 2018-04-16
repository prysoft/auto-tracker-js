sap.ui.define([
    'com/prysoft/autotracker/controller/App.controller',
    'sap/ui/core/format/DateFormat',
    'sap/ui/model/Sorter',
    'sap/ui/model/Filter',
    'jquery.sap.global'
], function(Controller, DateFormat, Sorter, Filter, $){
    'use strict';

    var periodFormat = DateFormat.getInstance({
        pattern: 'dd.MM.yy HH:mm'
    });
    var periodDtFormat = DateFormat.getInstance({
        pattern: 'dd.MM.yy'
    });
    var dateFormat = DateFormat.getInstance({
        pattern: 'dd MMM yyyy'
    });

    var roundAndFormatFloat = function(flNum) {
        return !flNum ? '' : (flNum < 1.0 ? parseFloat(flNum.toFixed(4)) + '' : flNum.toFixed(0)).replace('.', ',');
    };

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
            setTimeout((function(){ this._fuelCardsMap = this.getView().getModel().getProperty('/fuelCardsMap'); }).bind(this), 0);
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

        _getGroupingOptId: function() {
            var groupingOption = sap.ui.getCore().byId('groupingOption');
            if (groupingOption) {
                var optIdx = groupingOption.getSelectedIndex();
                var groupButtons = groupingOption.getButtons();
                if (optIdx > -1 && optIdx < groupButtons.length) {
                    return groupButtons[optIdx].getId();
                }
            }
            return null;
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

                    var refueling_total = 0;
                    if (messages.length) {
                        var fuelChargesTab = sap.ui.xmlfragment("com.prysoft.autotracker.view.FuelCharges", oCtrl);
                        reportTabBar.addItem(fuelChargesTab);
                        for (var i = 0; i < messages.length; i++) {
                            if (messages[i].p && !isNaN(messages[i].p.refueling_amount)) {
                                refueling_total += messages[i].p.refueling_amount;
                            }
                        }
                    }

                    var theft_total = 0;
                    for (var i = 0; i < tables.length; i++) {
                        var tbl = tables[i];
                        // Временно скрываем сводку
                        if (tbl.name === 'unit_generic') {
                            continue;
                        }
                        // Merge data with fuel charge report
                        if (tbl.name === 'unit_thefts' && messages.length) {
                            for (var k = 0; k < tbl.values.length; k++) {
                                var t = oCtrl.parseDate(tbl.values[k][1]);
                                var dt = null;
                                if (t) {
                                    dt = new Date(t.getTime());
                                    dt.setHours(0, 0, 0, 0);
                                }
                                var theft_amount = (tbl.values[k][3]).replace(/([^\d^.]+)/g, '');
                                if (!isNaN(theft_amount)) {
                                    theft_amount = parseFloat(theft_amount);
                                    theft_total += theft_amount;
                                }
                                messages.push({ t: t, dt: dt, theft_amount: theft_amount, theft_place: tbl.values[k][2] });
                            }
                            continue;
                        }
                        var hdrColumns = [];
                        var columns = [];
                        var rows = [];
                        for (var j = 0; j < tbl.header.length; j++) {
                            var colSize = tbl.columnSizes[j];
                            var colConfig = { width : colSize > 0 && colSize < 4 ? (colSize * 1.5) + 'em' : undefined };
                            columns.push(new sap.m.Column(colConfig));
                            hdrColumns.push(new sap.m.Column($.extend({header: new sap.m.Label({text: tbl.header[j]})}, colConfig)));
                            rows.push(new sap.m.Text({text:'{' + j + '}'}));
                        }
                        var oTableHeader = new sap.m.Table(tbl.name + '_tbl_hdr', {columns: hdrColumns, showNoData: false});
                        var oTable = new sap.m.Table(tbl.name + '_tbl', {columns: columns});
                        oTable.bindItems('/values', new sap.m.ColumnListItem({cells: rows}));
                        oTable.setModel(new sap.ui.model.json.JSONModel(tbl));
                        reportTabBar.addItem(new sap.m.IconTabFilter({
                            key: 'tab_' + tbl.name,
                            text: tbl.label,
                            content: [
                                oTableHeader,
                                new sap.m.ScrollContainer({
                                    height: 'calc(100% - 6rem)',
                                    width: '100%',
                                    horizontal: false,
                                    vertical: true,
                                    content: [oTable]
                                }),
                                new sap.m.Button({
                                    icon: 'sap-icon://save',
                                    type: 'Transparent',
                                    press: (oCtrl.saveGenericReport).bind(oCtrl)
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
                    oView.getModel().setProperty('/fuelChargesReport', {refueling_total: refueling_total, theft_total: theft_total});

                    // Apply grouping and sorting after updating data
                    var optId = oCtrl._getGroupingOptId();
                    if (optId) {
                        oCtrl._sortFuelChargeReport(optId);
                    }
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

        _calcGroupData: function(groupRecord, refuelingAmount, theftAmount) {
            var oGroup = groupRecord.oGroup;
            var groupCells = groupRecord.groupHeader.getCells();
            groupCells[3].setText(roundAndFormatFloat(oGroup.refuellingTotal += refuelingAmount));
            groupCells[4].setText(roundAndFormatFloat(oGroup.theftTotal += theftAmount));
            return oGroup;
        },

        getMsgGroup: function(oContext) {
            var date = oContext.getProperty('dt');

            var refuelingAmount = oContext.getProperty('p/refueling_amount') || 0;
            // Если cardId undefined считаем слив
            var theftAmount = oContext.getProperty('theft_amount') || 0;

            var dtKey = date && date.getTime() || null;
            var groupRecord = this._groupMap[dtKey];
            if (!groupRecord) {
                return {
                    key: dtKey,
                    grouping: 'groupByDate',
                    title: date && dateFormat.format(date) || '',
                    refuellingTotal: refuelingAmount,
                    theftTotal: theftAmount
                };
            }

            return this._calcGroupData(groupRecord, refuelingAmount, theftAmount);
        },

        getCardIdGroup: function(oContext) {
            var cardId = oContext.getProperty('p/refueling_card_id');

            var refuelingAmount = oContext.getProperty('p/refueling_amount') || 0;
            // Если cardId undefined считаем слив
            var theftAmount = oContext.getProperty('theft_amount') || 0;

            var groupRecord = this._groupMap[cardId];
            if (!groupRecord) {
                var fuelCard = cardId === undefined ? {name: 'Слив'} : this._fuelCardsMap[cardId];
                var groupTitle = fuelCard ? fuelCard.name : 'id:' + cardId;

                return {
                    key: cardId,
                    grouping: 'groupByRcvr',
                    title: groupTitle,
                    refuellingTotal: refuelingAmount,
                    theftTotal: theftAmount
                };
            }

            return this._calcGroupData(groupRecord, refuelingAmount, theftAmount);
        },

        getMsgGroupHeader: function(oGroup) {
            var rflTotalFormatted = roundAndFormatFloat(oGroup.refuellingTotal);
            var theftTotalFormatted = roundAndFormatFloat(oGroup.theftTotal);
            var cells = [];
            var groupHeader;
            if (oGroup.grouping == 'groupByRcvr') {
                cells.push(new sap.m.Text({text: ''}));
                cells.push(new sap.m.Text({text: oGroup.title}));
                cells.push(new sap.m.Text({text: oGroup.key}));
            } else {
                cells.push(new sap.m.Text({text: oGroup.title}));
                cells.push(new sap.m.Text({text: ''}));
                cells.push(new sap.m.Text({text: ''}));
            }
            cells.push(new sap.m.Text({text: rflTotalFormatted}));
            cells.push(new sap.m.Text({text: theftTotalFormatted}));
            groupHeader = new sap.m.ColumnListItem({ cells: cells }).addStyleClass('sapMGHLI groupingGHCLM');

            if (!(oGroup.key in this._groupMap)) {
                this._groupMap[oGroup.key] = {groupHeader: groupHeader, oGroup: oGroup};
            }

            return groupHeader;
        },

        _sortFuelChargeReport: function(groupOption) {
            this._groupMap = {};

            var sorters = [];
            switch(groupOption) {
                case 'groupByRcvr':
                    sorters.push(new Sorter('p/refueling_card_id', false, (this.getCardIdGroup).bind(this)));
                    sorters.push(new Sorter('dt', true));
                    break;
                case 'groupByDate':
                    sorters.push(new Sorter('dt', true, (this.getMsgGroup).bind(this)));
                    break;
                default: return;
            }
            sorters.push(new Sorter('t'));

            var tblFuelMessages = sap.ui.getCore().byId('tblFuelMessages');
            tblFuelMessages.getBinding('items').sort(sorters);
        },

        onSelectGroupBy: function(oEvt) {
            var btn = oEvt.getSource().getSelectedButton();
            var btnId = btn.getId();
            this._sortFuelChargeReport(btnId);
        },

        formatRefuelingCardId: function(theftPlace, cardId, fuelCardsMap) {
            if (theftPlace !== undefined) {
                return 'Слив: ' + theftPlace;
            }
            if (cardId === undefined) {
                return '---';
            }
            var fuelCard = fuelCardsMap[cardId];
            return fuelCard ? fuelCard.name : '(отсутствует в справочнике)';
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
        },

        saveChargeReport: function() {
            var title = 'Отпуск топлива ' + (this._getGroupingOptId() == 'groupByRcvr' ? 'по получателям' : 'по дате') + '\r\n';
            var prd = this._getPeriodDates();
            var subtitle = 'Период: ' + (prd ? 'c ' + periodDtFormat.format(prd[0]) + ' по ' + periodDtFormat.format(prd[1]) : '') + '\r\n';
            var header = title + subtitle + 'Дата/время;Получатель;ID;По карте(л);Без карты(л)\r\n';

            var body = '';
            var tblFuelMessages = sap.ui.getCore().byId('tblFuelMessages');
            var tblItems = tblFuelMessages.getItems();
            for(var i = 0; i < tblItems.length; i++) {
                if (tblItems[i] instanceof sap.m.ColumnListItem) {
                    var cells = tblItems[i].getCells();
                    var tblRow = '';
                    for (var j = 0; j < cells.length; j++) {
                        tblRow += cells[j].getText() + (j < cells.length - 1 ? ';' : '');
                    }
                    body += tblRow + '\r\n';
                } else if (tblItems[i] instanceof sap.m.GroupHeaderListItem) {
                    body += tblItems[i].getTitle() + '\r\n';
                } else {
                    body += '\r\n';
                }
            }

            var tblFuelMsgFooter = sap.ui.getCore().byId('tblFuelMsgFooter');
            var refuelingTotal = tblFuelMsgFooter.getColumns()[2].getFooter().getText();
            var theftTotal = tblFuelMsgFooter.getColumns()[3].getFooter().getText();
            var footer = ';ИТОГО;;' + refuelingTotal + ';' + theftTotal + '\r\n';
            this.saveToBinaryFile('FuelChargeReport.csv', header + body + footer);
        },

        saveGenericReport: function() {
            var reportTabBar = this.getView().byId('reportTabBar');
            var selectedKey = reportTabBar.getSelectedKey();
            if (!selectedKey) {
                return;
            }
            var tableName = selectedKey.replace(/^tab_/, '');
            var oModel = sap.ui.getCore().byId(tableName + '_tbl').getModel();

            var tableHeader = oModel.getProperty('/header');
            var header = '';
            for (var i = 0; i < tableHeader.length; i++) {
                header += (i == 0 ? '' : ';') + tableHeader[i];
            }
            header += '\r\n';

            var tableRows = oModel.getProperty('/values');
            var body = '';
            for (var i = 0; i < tableRows.length; i++) {
                var row = tableRows[i];
                for (var j = 0 ; j < row.length; j++) {
                    var cell = row[j];
                    if (typeof cell == 'number') {
                        cell = (cell + '').replace('.', ',');
                    }
                    body += (j == 0 ? '' : ';') + cell;
                }
                body += '\r\n';
            }

            this.saveToBinaryFile(tableName.replace(/^unit_/, '') + '_report.csv', header + body);
        }
    });
});
