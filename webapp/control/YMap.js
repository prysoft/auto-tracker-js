/**
 * Created by Varzinov on 13.12.2017.
 */

sap.ui.define([
    "sap/ui/core/Control",
    'jquery.sap.global'
], function (Control, $) {
    "use strict";

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

        init: function () {
        },

        _getAnimationContent: function(objId) {
            var objOverlay = this._yMapObjectManager.objects.overlays.getById(objId);
            if (!objOverlay) {
                return $([]);
            }
            var iconLayout = objOverlay.getIconLayoutSync();
            if (!iconLayout) {
                return $([]);
            }
            return $(iconLayout.getElement()).find('.ymap-obj-animation-content');
        },

        startObjectAnimation: function(objId) {
            this._getAnimationContent(objId).addClass('ymap-active-obj');
        },

        stopObjectAnimation: function(objId) {
            this._getAnimationContent(objId).removeClass('ymap-active-obj');
        },

        animateObject: function(objId) {
            this.startObjectAnimation(objId);
            setTimeout((function(){
                this.stopObjectAnimation(objId);
            }).bind(this), 7000);
        },

        _addGeoObjectsToMap: function(geoObjects) {
            if (geoObjects) {
                var unitIconContentLayout = ymaps.templateLayoutFactory.createClass([
                    '<div class="ymap-obj-animation-content" style="width:32px;height:32px;"></div>'
                ].join(''));
                for (var i = 0; geoObjects && i < geoObjects.length; i++) {
                    geoObjects[i].options.iconLayout = 'default#imageWithContent';
                    //geoObjects[i].options.iconContentOffset = [16, 16];
                    geoObjects[i].options.iconContentLayout = unitIconContentLayout;
                }
                console.log('unitIconContentLayout', unitIconContentLayout, geoObjects);

                this._yMapObjectManager.add({type: "FeatureCollection", features: geoObjects});
                this._yMap.setBounds(this._yMapObjectManager.getBounds()/*, {checkZoomRange:true}*/);
            }
        },

        setGeoObjects: function(newVal) {
            if (this._yMapObjectManager) {
                this._yMapObjectManager.removeAll();
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

                    // Создаем ObjectManager для объектов карты
                    this._yMapObjectManager = new ymaps.ObjectManager({
                        // Чтобы метки начали кластеризоваться, выставляем опцию.
                        clusterize: true,
                        // ObjectManager принимает те же опции, что и кластеризатор.
                        gridSize: 32,
                        clusterDisableClickZoom: true
                    });

                    // Чтобы задать опции одиночным объектам и кластерам,
                    // обратимся к дочерним коллекциям ObjectManager.
                    this._yMapObjectManager.objects.options.set('preset', 'islands#greenDotIcon');
                    this._yMapObjectManager.clusters.options.set('preset', 'islands#greenClusterIcons');
                    setTimeout((function(){
                        this._addGeoObjectsToMap(this.getGeoObjects());
                    }).bind(this));
                    this._yMap.geoObjects.add(this._yMapObjectManager);
                }
            }).bind(this));
        },

        panTo: function(geoObjectId) {
            var geoObjects = this.getGeoObjects();
            for (var i = 0; i < geoObjects.length; i++) {
                if (geoObjects[i].id == geoObjectId) {

                    var _this = this;
                    var yMap = this._yMap;
                    yMap.setBounds(this._yMapObjectManager.getBounds()).then(function(){
                        setTimeout(function(){
                            yMap.panTo(geoObjects[i].geometry.coordinates).then(function(){
                                setTimeout(function(){
                                    var zoom = yMap.getZoom();
                                    var opts = {duration: 700};
                                    var maxZoom = 16;
                                    var zoomFunc = function() {
                                        if (zoom >= maxZoom) {
                                            _this.animateObject(geoObjectId);
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

                    return;
                }
            }
        }

    });
});
