(function($, window) {
    'use strict';

    var privateMethods = {};
    var instance;

    function Recovery(options) {
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
        $('section.recovery form').submit(function() {
            $('section.recovery').block({
                message: 'Сохранение...',
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
                user: {
                    password1: $('#recovery #password1').val(),
                    password2: $('#recovery #password2').val(),
                    recaptcha_challenge_field: $('#recovery input#recaptcha_challenge_field').val(),
                    recaptcha_response_field: $('#recovery input#recaptcha_response_field').val()
                }
            }).success(function(data) {
                if (data.error) {
                    $.fn.notifier(data.error);
                } else {
                    $('#recovery #password1').val('');
                    $('#recovery #password2').val('');
                    $.fn.notifier('Через 5 секунд вы будете перенаправлены на главную страницу', data.msg);
                    setTimeout(function() {
                        location.replace('http://' + window.location.host);
                    }, 5000);
                }
            }).error(function() {
                $.fn.notifier('Ошибка отправки');
            }).complete(function() {
                $('section.recovery').unblock();
                Recaptcha.reload();
                $('#recovery input#recaptcha_response_field').val('');
            });

            return false;
        });
    };

    privateMethods.init = function(recovery) {
        $.extend(true, privateMethods, recovery);

        if (!privateMethods.helpers.browserCheck()) {
            return alert('Внимание: ваш браузер устарел, для работы чата обновите его.');
        }

        privateMethods.form();
    };

    $.fn.recovery = function(user, serverKey, env, csrf) {
        return instance ? instance : instance = new Recovery({
            currentUser: user,
            serverKey: serverKey,
            env: env,
            csrf: csrf
        });
    };
})(jQuery, window);