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
        var textAreaHeight;

        $('section.contact textarea#message').autoResize({
            maxHeight: 500,
            minHeight: 100,
            animate: false,
            onBeforeResize: function() {
                textAreaHeight = $(this).height();
            },
            onAfterResize: function() {
                $(this).parent().css('height', ($(this).parent().height() - (textAreaHeight - $(this).height())) + 'px');
            }
        });

        $('section.contact form').submit(function() {
            $('section.contact').block({
                message: 'Отправка...',
                css: {
                    'border': 'none',
                    'background': 'transparent',
                    'height': '25px',
                    'line-height': '25px',
                    'color': '#C4B1C4',
                    'font-size': '1.1em'
                },
                overlayCSS: {
                    opacity: 0.6,
                    backgroundColor: '#4A324A'
                }
            });

            $.post(window.location.href, {
                _csrf: privateMethods.options.csrf,
                contact: {
                    name: $('#contact #name').val(),
                    email: $('#contact #email').val(),
                    message: $('#contact #message').val(),
                    recaptcha_challenge_field: $('#contact input#recaptcha_challenge_field').val(),
                    recaptcha_response_field: $('#contact input#recaptcha_response_field').val()
                }
            }).success(function(data) {
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

    $.fn.contact = function(env, csrf) {
        return instance ? instance : instance = new Contact({ env: env, csrf: csrf });
    };
})(jQuery, window);