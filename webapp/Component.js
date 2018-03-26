/**
 * Created by Varzinov on 08.12.2017.
 */

sap.ui.define([
    'sap/ui/core/UIComponent',
    'sap/ui/model/json/JSONModel',
    'sap/ui/Device'
], function (UIComponent, JSONModel, Device) {
    'use strict';

    var isAuthorized = true;
    var requestedTarget;

    return UIComponent.extend('com.prysoft.autotracker.Component', {

        metadata : {
            manifest: 'json'
        },

        init : function () {
            UIComponent.prototype.init.apply(this, arguments);

            sap.ui.getCore().loadLibrary("openui5.simplecharts", "./openui5-simplecharts/src/openui5/simplecharts/");
            jQuery.sap.registerModulePath('bower_component', './openui5-simplecharts/bower_components');

            this.getRouter().attachRouteMatched(function(evt){
                requestedTarget = evt.getParameter('name');
                if (!isAuthorized) {
                    this.getTargets().display('login');
                }
                /*}).attachBypassed(function(evt){
                 var hash = evt.getParameter("hash");
                 //jQuery.sap.log.info('ROUTE_NAME: ' + routeName);
                 console.info('HASH: ' + hash);*/
            }, this).initialize();

            // set the device model. View usage example: visible="{device>/support/touch}" showRefreshButton="{= !${device>/support/touch} }"
            var oDeviceModel = new JSONModel(Device);
            oDeviceModel.setDefaultBindingMode("OneWay");
            this.setModel(oDeviceModel, 'device');

            // set data model
            var oData = {
                periodCombo: [
                    {key: 't', text: 'Сегодня'},
                    {key: 'y', text: 'Вчера'},
                    {key: 'w', text: 'За неделю'},
                    {key: 'm', text: 'За месяц'}
                ]
            };
            var oModel = new JSONModel(oData);
            this.setModel(oModel);

            var fuelCardsModel = new JSONModel(jQuery.sap.getModulePath('com.prysoft.autotracker.config', '/fuel_cards.json'));
            fuelCardsModel.attachRequestCompleted(function(evt) {
                var fuelCards = fuelCardsModel.getProperty('/');
                var fuelCardsMap = {};
                for (var i = 0; i < fuelCards.length; i++) {
                    fuelCardsMap[fuelCards[i].cardId] = {key: fuelCards[i].key, name: fuelCards[i].name};
                }
                oModel.setProperty('/fuelCardsMap', fuelCardsMap);
            });
        },

        setAuthorized: function(newVal) {
            isAuthorized = !!newVal;
            //this.getTargets().display(this.getMetadata().getRootView().viewName);
            this.getTargets().display(isAuthorized ? requestedTarget : 'login');
        }
    });

});
