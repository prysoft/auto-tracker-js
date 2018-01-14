sap.ui.define([
    'com/prysoft/autotracker/controller/App.controller'
], function(Controller){
    'use strict';

    return Controller.extend('com.prysoft.autotracker.controller.TechState', {
        onInit: function(){
            console.log('TECHSTATE_INIT');

            var oDataset = new openui5.simplecharts.SimpleChartData();
            oDataset.bindDimensions({ items: [
                {name: 'label', /*description: 'Наполненность парка',*/ axis: 'x'},
                {name: 'value', /*description: '',*/ axis: 'y'}
            ]});
            oDataset.bindMeasures({ items: [
                {name: 'value2', description: '%', rank: '1'}
            ]});
            var data = { items: [
                { label: 'Цистерны', value: 'fuel', value2: 99.28},
                { label: 'Цистерны', value: 'empty', value2: 0.72},
                { label: 'Баки', value: 'fuel', value2: 64.98},
                { label: 'Баки', value: 'empty', value2: 35.02}
            ]};
            oDataset.bindData(data);

            var chart = new openui5.simplecharts.SimpleStackedBarChart({
                title: 'Наполненность парка ТЗ',
                drawLegend: false,
                colors: {fuel: '#fac364', empty: '#eff4f9'}
            });
            chart.setDataSet(oDataset);

            var flexBox = this.getView().byId('fuelchart');
            flexBox.addItem(chart);

            setTimeout((function(){
                var cmbPeriod = this.getView().byId('cmbPeriod');
                cmbPeriod.setSelectedItem(cmbPeriod.getFirstItem());
            }).bind(this));
        },

        cmbPeriodChange: function(oEvt) {
            var selectedItem = oEvt.getParameter('selectedItem');
            console.log('Selected item: ' + selectedItem.getKey() + ' -> ' + selectedItem.getText());
        }
    });
});
