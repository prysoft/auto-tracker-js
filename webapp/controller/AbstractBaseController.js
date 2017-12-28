sap.ui.define([
    'sap/ui/core/mvc/Controller',
    'sap/ui/core/routing/History',
    'jquery.sap.global'
], function(Controller, History, jQuery){
    'use strict';

    return Controller.extend('com.prysoft.autotracker.controller.AbstractBaseController', {
        getRouter: function () {
            return sap.ui.core.UIComponent.getRouterFor(this);
        },

        getCookie: function(name) {
            var matches = document.cookie.match(new RegExp(
                "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
            ));
            return matches ? decodeURIComponent(matches[1]) : undefined;
        },
        /**
         * options:
         * expires Число – количество секунд до истечения,
         *         Объект Date – дата истечения,
         *         Если expires в прошлом - то cookie будет удалено
         *         Если expires отсутствует или 0, то cookie будет установлено как сессионное и исчезнет при закрытии браузера.
         *
         * path Путь для cookie.
         * domain Домен для cookie.
         * secure Если true, то пересылать cookie только по защищенному соединению.
         */
        setCookie: function(name, value, options) {
            //document.cookie = 'userName=Test; path=/; expires=' + new Date(new Date().getTime() + 60 * 1000).toUTCString();
            options = options || {};

            var expires = options.expires;

            if (typeof expires == "number" && expires) {
                var d = new Date();
                d.setTime(d.getTime() + expires * 1000);
                expires = options.expires = d;
            }
            if (expires && expires.toUTCString) {
                options.expires = expires.toUTCString();
            }

            value = encodeURIComponent(value);

            var updatedCookie = name + "=" + value;

            for (var propName in options) {
                updatedCookie += "; " + propName;
                var propValue = options[propName];
                if (propValue !== true) {
                    updatedCookie += "=" + propValue;
                }
            }

            document.cookie = updatedCookie;
        },
        removeCookie: function(name, path) {
            var options = {expires: new Date(0)};
            if (path) {
                options.path = path;
            }
            this.setCookie(name, '', options);
        },

        formatDateRelative: function(date) {
            if (Object.prototype.toString.call(date) !== '[object Date]') {
                return;
            }

            var diff = new Date() - date; // разница в миллисекундах

            if (diff < 1000) { // прошло менее 1 секунды
                return 'только что';
            }

            var sec = Math.floor(diff / 1000); // округлить diff до секунд
            if (sec < 60) {
                return sec + ' сек. назад';
            }

            var min = Math.floor(diff / 60000); // округлить diff до минут
            if (min < 60) {
                return min + ' мин. назад';
            }

            var hr = Math.floor(diff / 3600000); // округлить diff до часов
            if (hr < 24) {
                return hr + ' ч. назад';
            }

            var days = Math.floor(diff / 86400000); // округлить diff до дней
            if (days == 1) {
                return 'вчера';
            } else if (days < 7) {
                return days + (days < 5 ? ' дня' : ' дней') + ' назад';
            }

            var wk = Math.floor(diff / 604800000); // округлить diff до недель
            if (wk < 4) {
                return wk + (wk < 2 ? ' неделя' : ' недели') + ' назад';
            }

            var mon = Math.floor(diff / (4 * 604800000)); // округлить diff до месяцев
            if (mon < 7) {
                return mon + ' мес. назад';
            }

            return 'давно';
        },

        goBack: function (oEvent) {
            var oHistory, sPreviousHash;

            oHistory = History.getInstance();
            sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getRouter().navTo('start', {}, true /*no history*/);
            }
        },

        doAjax : function(path, content, type, async) {
            var params = {
                url : 'http://localhost:8080' + path,
                dataType : 'json',
                contentType : 'application/json; charset=utf-8',
                context : this,
                cache : false
            };
            params['type'] = type || 'POST';
            if (async === false) {
                params['async'] = async;
            }
            if (content) {
                params['data'] = JSON.stringify(content);
            }
            return jQuery.ajax(params);
        },
        getStatusTextFromResponse: function(response) {
            switch(response.status) {
                case 0:
                    return 'Сервер не отвечает';
                case 403:
                    return 'Доступ к ресурсу запрещен для данного пользователя';
                default:
                    return response.statusText;
            }
        },

        setSelectionRange: function(inputDomElement, selectionStart, selectionEnd) {
            if (inputDomElement.setSelectionRange) {
                inputDomElement.focus();
                inputDomElement.setSelectionRange(selectionStart, selectionEnd);
            } else if (inputDomElement.createTextRange) {
                var range = inputDomElement.createTextRange();
                range.collapse(true);
                range.moveEnd('character', selectionEnd);
                range.moveStart('character', selectionStart);
                range.select();
            }
        },
        setCaretToPos: function (inputDomElement, pos) {
            this.setSelectionRange(inputDomElement, pos, pos);
        }
    });
});
