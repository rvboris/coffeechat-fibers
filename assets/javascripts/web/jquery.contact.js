(function($, window) {
    'use strict';

    var privateMethods = {};
    var instance;

    function Contact (options) {
        this.options = options;
        return privateMethods.init(this);
    }

    privateMethods.helpers = {
        browserCheck: function() {
            return ($.browser.name == 'firefox' && $.browser.versionNumber >= 4) ||
                ($.browser.name == 'msie' && $.browser.versionNumber >= 9) ||
                ($.browser.name == 'chrome' && $.browser.versionNumber >= 10) ||
                ($.browser.name == 'opera' && $.browser.versionNumber >= 9.8) ||
                ($.browser.name == 'safari' && $.browser.versionNumber >= 5);
        }
    };

    privateMethods.form = function() {

    };

    privateMethods.init = function(contact) {
        $.extend(true, privateMethods, contact);

        if (!privateMethods.helpers.browserCheck()) {
            return alert('Внимание: ваш браузер устарел, для работы чата обновите его.');
        }

        privateMethods.form();
    };

    $.fn.contact = function(env) {
        return instance ? instance : instance = new Contact({ env: env });
    };
})(jQuery, window);