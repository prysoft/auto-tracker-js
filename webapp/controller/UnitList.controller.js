sap.ui.define([
    'com/prysoft/autotracker/controller/Home.controller',
    'sap/ui/model/Filter'
], function(Controller, Filter){
    'use strict';

    return Controller.extend('com.prysoft.autotracker.controller.UnitList', {
        onInit: function(){
            console.log('UNIT_LIST_INIT');
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
