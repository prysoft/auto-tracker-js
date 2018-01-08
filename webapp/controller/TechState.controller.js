sap.ui.define([
    'com/prysoft/autotracker/controller/App.controller'
], function(Controller){
    'use strict';

    return Controller.extend('com.prysoft.autotracker.controller.TechState', {
        onInit: function(){
            console.log('TECHSTATE_INIT');


            var oDataset = new openui5.simplecharts.SimpleChartData();
            oDataset.bindDimensions({ items : [ { name: "label", description:"Equipa", axis: "x"},
                {name:"value", description:"Ano", axis:"y"}]});
            oDataset.bindMeasures({ items : [ { name: "value2", description:"Golos", rank: "1"}]});
            var data = { "items": [
                { "label": "Benfica", "value": "2014", "value2":"70"},
                { "label": "Benfica", "value": "2013", "value2":"60"},
                { "label": "Sporting", "value": "2014", "value2":"50"},
                { "label": "Sporting", "value": "2013", "value2":"40"},
                { "label": "FC Porto", "value": "2014", "value2":"30"},
                { "label": "FC Porto", "value": "2013", "value2":"20"},
                { "label": "Benfica", "value": "2012", "value2":"70"},
                { "label": "Benfica", "value": "2011", "value2":"14"},
                { "label": "Sporting", "value": "2012", "value2":"50"},
                { "label": "Sporting", "value": "2011", "value2":"40"},
                { "label": "FC Porto", "value": "2012", "value2":"30"},
                { "label": "FC Porto", "value": "2011", "value2":"30"}
            ]};
            // var data = { "items": [
            //     { "label": "Наполненность парка (цистерны ТЗ)", "value": "2014", "value2":"70"},
            //     { "label": "Наполненность парка (цистерны ТЗ)", "value": "2013", "value2":"60"},
            //     { "label": "Наполненность баков парка ТЗ", "value": "2014", "value2":"50"},
            //     { "label": "Наполненность баков парка ТЗ", "value": "2013", "value2":"40"}
            // ]};
            oDataset.bindData(data);

            var chart = new openui5.simplecharts.SimpleStackedBarChart({ title: "Goals by Year"});
            chart.setDataSet(oDataset);

            var panel = this.getView().byId("fuelchart");
            panel.addContent(chart);
        }
    });
});
