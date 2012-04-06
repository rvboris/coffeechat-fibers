(function($, window) {
    'use strict';

    var privateMethods = {};
    var instance;

    function Admin(options) {
        this.options = options;
        this.socket = io.connect(window.location.protocol + '//' + window.location.hostname + ':' + options.logserver);
        return privateMethods.init(this);
    }

    privateMethods.helpers = {
        browserCheck: function() {
            return ($.browser.name === 'firefox' && $.browser.versionNumber >= 4)   ||
                   ($.browser.name === 'msie'    && $.browser.versionNumber >= 9)   ||
                   ($.browser.name === 'chrome'  && $.browser.versionNumber >= 10)  ||
                   ($.browser.name === 'opera'   && $.browser.versionNumber >= 9.8) ||
                   ($.browser.name === 'safari'  && $.browser.versionNumber >= 5);
        }
    };

    privateMethods.systemConsole = function() {
        $('#console-button').on('click', function() {
            $('div.console').slideToggle('fast');
            return false;
        });
        privateMethods.socket.on('log', function(data) {
            $('div.console').prepend('<div>' + data + '</div>');
        });
    };

    privateMethods.init = function(admin) {
        $.extend(true, privateMethods, admin);

        if (!privateMethods.helpers.browserCheck()) {
            return alert('Внимание: ваш браузер устарел, для работы чата обновите его.');
        }

        privateMethods.systemConsole();
    };

    $.fn.admin = function(env, csrf, logserver) {
        return instance ? instance : instance = new Admin({ env: env, csrf: csrf, logserver: logserver });
    };
})(jQuery, window);