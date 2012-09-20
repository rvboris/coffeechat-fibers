(function($, window) {
    'use strict';

    var privateMethods = {};
    var instance;

    function Archive (options) {
        this.options = options;
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

    privateMethods.smiles = function() {
        $('#messages .message > p').each(function(idx, el) {
            $(el).html($().emoticon($(el).html()));
        });
    };

    privateMethods.init = function(archive) {
        $.extend(true, privateMethods, archive);

        if (!privateMethods.helpers.browserCheck()) {
            return alert('Внимание: ваш браузер устарел, для работы чата обновите его.');
        }

        privateMethods.smiles();

        if (typeof share42 === 'function') {
            share42(window.location.protocol + '//' + window.location.host + '/images/web/social.png');
        }
    };

    $.fn.archive = function(env, csrf) {
        return instance ? instance : instance = new Archive({ env: env, csrf: csrf });
    };
})(jQuery, window);