sap.ui.define([
    'com/prysoft/autotracker/controller/App.controller'
], function(Controller){
    'use strict';

    var messageRecieved;

    return Controller.extend('com.prysoft.autotracker.controller.Login', {
        onInit: function(){
            this.getRouter().getTarget('login').attachDisplay(function(oEvent) {
                var loginByToken = (function(token){
                    wialon.core.Session.getInstance().initSession('https://hst-api.wialon.com');
                    wialon.core.Session.getInstance().loginToken(token, '', (function(code) {
                        if (code) {
                            throw new Error('Failed to log in by token. Error code: ' + wialon.core.Errors.getErrorText(code));
                        }

                        window.removeEventListener('message', messageRecieved);
                        this.setCookie('access_token', token, {path: '/', expires: 4 * 60 * 60});
                        this.getOwnerComponent().setAuthorized(true);

                        var user = wialon.core.Session.getInstance().getCurrUser();
                        console.log('USER LOGGED IN AS ' + user.getName());

                        this.loadAvlData();
                    }).bind(this));
                }).bind(this);

                //var token = this.getCookie('access_token');
                var token = '5dce19710a5e26ab8b7b8986cb3c49e58C291791B7F0A7AEB8AFBFCEED7DC03BC48FF5F8'; //SdkDemo

                if (token) {
                    loginByToken(token);
                } else {
                    window.addEventListener('message', messageRecieved = (function(e){
                        var msg = e.data;
                        var match;
                        if (Object.prototype.toString.call(msg) !== '[object String]'
                            || !(match = msg.match(/^access_token=([0-9A-Fa-f]+)$/))) {
                            return;
                        }

                        loginByToken(match[1]);
                    }).bind(this));
                }

                this.getView().rerender();
            }, this);
        }

    });
});