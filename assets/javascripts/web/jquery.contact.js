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
            return ($.browser.name === 'firefox' && $.browser.versionNumber >= 4)   ||
                   ($.browser.name === 'msie'    && $.browser.versionNumber >= 9)   ||
                   ($.browser.name === 'chrome'  && $.browser.versionNumber >= 10)  ||
                   ($.browser.name === 'opera'   && $.browser.versionNumber >= 9.8) ||
                   ($.browser.name === 'safari'  && $.browser.versionNumber >= 5);
        }
    };

    privateMethods.form = function() {
        $('section.contact form').submit(function() {
            $('section.contact').block({
                message   : 'Отправка...',
                css       : {
                    'border'     : 'none',
                    'background' : 'transparent',
                    'height'     : '25px',
                    'line-height': '25px',
                    'color'      : '#C4B1C4',
                    'font-size'  : '1.1em'
                },
                overlayCSS: {
                    opacity        : 0.6,
                    backgroundColor: '#4A324A'
                }
            });

            $.post(window.location.href, { contact: {
                name   : $('#contact #name').val(),
                email  : $('#contact #email').val(),
                message: $('#contact #message').val()
            }}).success(function(data) {
                if (data.error) {
                    $.fn.notifier(data.error);
                } else {
                    $('#contact #name').val('');
                    $('#contact #email').val('');
                    $('#contact #message').val('');
                    $.fn.notifier('Сообщение успешно отправлено');
                }
            }).error(function() {
                $.fn.notifier('Ошибка отправки');
            }).complete(function() {
                $('section.contact').unblock();
            });

            return false;
        });
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