/**
 * Created by Varzinov on 13.12.2017.
 */

sap.ui.define([
    "sap/ui/core/Control",
    'jquery.sap.global'
], function (Control, $) {
    "use strict";

    var unitIconContentLayout;

    var GeoObjectEx = function(geoObjectConfig){
        if (!unitIconContentLayout) {
            unitIconContentLayout = ymaps.templateLayoutFactory.createClass([
                '<div class="ymap-obj-animation-content" style="width:32px;height:32px;"></div>'
            ].join(''));
        }
        geoObjectConfig.options.iconLayout = 'default#imageWithContent';
        //geoObjectConfig.options.iconContentOffset = [16, 16];
        geoObjectConfig.options.iconContentLayout = unitIconContentLayout;

        var ymapsGeoObject = new ymaps.GeoObject(geoObjectConfig.feature, geoObjectConfig.options);

        ymapsGeoObject.moveTo = function(coords){
            ymapsGeoObject.geometry.setCoordinates(coords);
        };

        ymapsGeoObject._getAnimationContent = function() {
            var objOverlay = ymapsGeoObject.getOverlaySync();
            if (!objOverlay) {
                return $([]);
            }
            var iconLayout = objOverlay.getIconLayoutSync();
            if (!iconLayout) {
                return $([]);
            }
            return $(iconLayout.getElement()).find('.ymap-obj-animation-content');
        };

        ymapsGeoObject.startObjectAnimation = function() {
            this._getAnimationContent().addClass('ymap-active-obj');
        };

            ymapsGeoObject.stopObjectAnimation = function() {
            this._getAnimationContent().removeClass('ymap-active-obj');
        };

        ymapsGeoObject.animateObject = function() {
            this.startObjectAnimation();
            setTimeout((function(){
                this.stopObjectAnimation();
            }).bind(this), 7000);
        };

        return ymapsGeoObject;
    };

    return Control.extend("com.prysoft.sap.control.YMap", {
        metadata: {
            properties: {
                "fitContainer" : {type : "boolean", defaultValue : false},
                "showBackButton": {type : "boolean", defaultValue : false},
                "geoObjects": "object"
            },
            /* aggregations: {
                layoutData: {type: "sap.ui.core.LayoutData", multiple: false, visibility: "hidden"}
            },*/
            events: {
                backButtonPress: {
                    enablePreventDefault : true/*,
                    parameters: {
                        value: {type: "int"}
                    }*/
                }
            }
        },

        findGeoObjectById: function(id){
            var obj = null;
            this._yMapGeoObjects && this._yMapGeoObjects.each(function(geoObject){
                if (geoObject.properties.get('id') == id) {
                    obj = geoObject;
                    return false;
                }
            }, this);
            return obj;
        },

        init: function () {
            var oEventBus = sap.ui.getCore().getEventBus();
            oEventBus.subscribe('sap.global', 'wialonMessageRegistered', function(channelId, eventId, dataMap){
                if (!this._yMap || !dataMap.data || !dataMap.data.pos) {
                    return;
                }

                var geoObj = this.findGeoObjectById(dataMap.unitId);
                if (geoObj) {
                    geoObj.animateObject();
                    geoObj.moveTo([dataMap.data.pos.y, dataMap.data.pos.x]);
                }
            }, this);
        },

        _addGeoObjectsToMap: function(geoObjects) {
            if (geoObjects) {
                this._yMapGeoObjects = new ymaps.GeoObjectCollection();
                for (var i = 0; geoObjects && i < geoObjects.length; i++) {
                    this._yMapGeoObjects.add(new GeoObjectEx(geoObjects[i]));
                }

                this._yMap.geoObjects.add(this._yMapGeoObjects);
                this._yMap.setBounds(this._yMapGeoObjects.getBounds()/*, {checkZoomRange:true}*/);
            }
        },

        setGeoObjects: function(newVal) {
            if (this._yMap) {
                if (this._yMapGeoObjects) {
                    this._yMap.geoObjects.remove(this._yMapGeoObjects);
                    this._yMapGeoObjects = null;
                }
                this._addGeoObjectsToMap(newVal);
            }

            this.setProperty('geoObjects', newVal, true);
        },

        renderer: function (oRenderMgr, oControl) {
            console.log('RENDERER');
            oRenderMgr.write("<div");
            oRenderMgr.writeControlData(oControl);
            oRenderMgr.addClass("prysoftYMap");
            oRenderMgr.writeClasses();
            if (oControl.getFitContainer()) {
                oRenderMgr.write(" style=\"position:absolute;width:100%;height:100%;\"");
            }
            oRenderMgr.write(">");
            //oRenderMgr.write("<div style=\"1px solid red\"");
            //oRM.renderControl(oControl.getAggregation("_rating"));
            //oRM.renderControl(oControl.getAggregation("_label"));
            //oRM.renderControl(oControl.getAggregation("_button"));
            oRenderMgr.write("</div>");
        },

        onAfterRendering: function() {
            console.log('AFTER_RENDER');
            if(sap.ui.core.Control.prototype.onAfterRendering) {
                console.log('onAfterRendering');
                sap.ui.core.Control.prototype.onAfterRendering.apply(this, arguments);
            }
            ymaps.ready((function () {
                if (!this._yMap) {
                    this._yMap = new ymaps.Map(this.sId, {
                        center: ['59.220492', '39.891568'],
                        zoom: 12,
                        type: 'yandex#hybrid',
                        controls: [
                            'zoomControl'
                            //'searchControl',
                            //'typeSelector',
                            //'fullscreenControl',
                            //'routeButtonControl',
                            //'trafficControl',
                            //'rulerControl',
                            //'geolocationControl'
                        ]
                    },{
                        searchControlProvider: 'yandex#search',
                        suppressMapOpenBlock: true
                    });

                    this._yMap.controls.add('geolocationControl', {
                        size: 'small',
                        float: 'right'
                    });

                    this._yMap.controls.add('typeSelector', {
                        size: 'small',
                        float: 'right'
                    });

                    if(this.getShowBackButton()) {
                        var backBtnLayout = ymaps.templateLayoutFactory.createClass([
                            '<div title="{{ data.title }}" class="ymap-navback-btn ',
                            '{% if state.size == "small" %}my-button_small{% endif %}',
                            '{% if state.size == "medium" %}my-button_medium{% endif %}',
                            '{% if state.size == "large" %}my-button_large{% endif %}',
                            '{% if state.selected %} my-button-selected{% endif %}">',
                            '<span aria-hidden="true" data-sap-ui-icon-content="" class="sapTntNavLIGroupIcon sapUiIcon sapUiIconMirrorInRTL" style="font-family:\'SAP-icons\';text-indent:-3px;"></span>',
                            //'<img class="my-button__img" src="{{ data.image }}" alt="{{ data.title }}">',
                            //'<span class="my-button__text">{{ data.content }}</span>',
                            '</div>'
                        ].join(''));

                        var ymapNavBackBtn = new ymaps.control.Button({
                            data: {
                                // Зададим текст и иконку для кнопки.
                                //content: "Адаптивная кнопка",
                                //content: "",
                                // Иконка имеет размер 16х16 пикселей.
                                //image: 'url(sap-icon://car-rental)',
                                title: 'Вернуться к списку'
                            },
                            options: {
                                layout: backBtnLayout,
                                float: 'left',
                                floatIndex: '500',
                                selectOnClick: false,
                                size: 'small'
                                // зададим ей три разных значения maxWidth в массиве.
                                //maxWidth: [28, 28, 28] //maxWidth: [28, 150, 178]
                            }
                        });

                        ymapNavBackBtn.events.add('press', (function () {
                            //this.getSplitAppObj().toMaster(this.createId("master2"));
                            this.fireBackButtonPress();
                        }).bind(this));

                        this._yMap.controls.add(ymapNavBackBtn);
                    }

                    setTimeout((function(){
                        this._addGeoObjectsToMap(this.getGeoObjects());
                    }).bind(this));
                }
            }).bind(this));
        },

        panTo: function(geoObjectId) {
            var geoObj = this.findGeoObjectById(geoObjectId);
            if (geoObj) {
                var yMap = this._yMap;
                yMap.setBounds(this._yMapGeoObjects.getBounds()).then(function(){
                    setTimeout(function(){
                        yMap.panTo(geoObj.geometry.getCoordinates()).then(function(){
                            setTimeout(function(){
                                var zoom = yMap.getZoom();
                                var opts = {duration: 700};
                                var maxZoom = 16;
                                var zoomFunc = function() {
                                    if (zoom >= maxZoom) {
                                        geoObj.animateObject();
                                        return;
                                    }

                                    zoom+= (maxZoom - zoom) > 4 ? 4 : (maxZoom - zoom);
                                    yMap.setZoom(zoom, opts).then(zoomFunc);
                                };
                                zoomFunc();
                            }, 500);
                        });
                    }, 1000);
                });
            }
        }

    });
});
