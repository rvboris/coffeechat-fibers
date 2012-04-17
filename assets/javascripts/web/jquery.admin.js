(function($, window) {
    'use strict';

    var privateMethods = {};
    var instance;

    function Admin(options) {
        this.options = options;
        this.socket = io.connect(window.location.protocol + '//' + window.location.hostname + ':' + options.logServer + '/logs');
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

    privateMethods.systemConsole = function () {
        $('#console-button').on('click', function () {
            var button = $(this);
            $('div.console').slideToggle('fast', function () {
                if ($(button).hasClass('up')) {
                    $(button).removeClass('up');
                    $(button).addClass('down');
                } else {
                    $(button).removeClass('down');
                    $(button).addClass('up');
                }
            });
            return false;
        });

        privateMethods.socket.on('log', function (data) {
            if ($('div.console').children().size() >= 300) {
                $('div.console div:last-child').remove();
            }
            $('div.console').prepend('<div>' + data + '</div>');
        });

        privateMethods.socket.on('connect', function () {
            $('div.console').prepend('<div><strong>socket connected</strong></div>');
            privateMethods.socket.emit('authentication', privateMethods.options.secretKey, function (data) {
                $('div.console').prepend('<div><strong>authentication...</strong></div>');
                $('div.console').prepend('<div><strong>' + data + '</strong></div>');
            });
        });
    };

    privateMethods.charts = {
        init: function() {
            privateMethods.charts.messagesPerSecond.init();
            privateMethods.charts.connectionsActivity.init();
        },
        messagesPerSecond: {
            stack: 0,
            init: function() {
                var series = new Rickshaw.Series.FixedDuration([
                    { name: 'messages', x: 0, y: 0 }
                ], new Rickshaw.Color.Palette({ scheme: 'spectrum14' }), {
                    maxDataPoints: 30,
                    timeInterval: 30000
                });

                var chart = new Rickshaw.Graph({
                    element: document.querySelector('#chart-messages'),
                    width: 800,
                    height: 150,
                    series: series,
                    interpolation: 'cardinal',
                    renderer: 'line',
                    offset: 'value'
                });

                new Rickshaw.Graph.Axis.Time({ graph: chart });
                new Rickshaw.Graph.Axis.Y({ graph: chart });

                chart.onUpdate(function() {
                    privateMethods.charts.messagesPerSecond.stack = 0;
                });

                chart.render();

                setInterval(function() {
                    series.addData({ messages: privateMethods.charts.messagesPerSecond.stack });
                    chart.update();
                }, 1000);

                privateMethods.socket.on('sendMessage', function() {
                    privateMethods.charts.messagesPerSecond.stack++;
                });
            }
        },
        connectionsActivity: {
            stack: 0,
            init: function() {
                var series = new Rickshaw.Series.FixedDuration([
                    { name: 'connections', x: 0, y: 0 }
                ], new Rickshaw.Color.Palette({ scheme: 'spectrum14' }), {
                    maxDataPoints: 30,
                    timeInterval: 30000
                });

                var chart = new Rickshaw.Graph({
                    element: document.querySelector('#chart-connections'),
                    width: 800,
                    height: 150,
                    series: series,
                    interpolation: 'step-after',
                    renderer: 'line',
                    offset: 'value'
                });

                new Rickshaw.Graph.Axis.Time({ graph: chart });
                new Rickshaw.Graph.Axis.Y({ graph: chart });

                chart.onUpdate(function() {
                    privateMethods.charts.connectionsActivity.stack = 0;
                });

                chart.render();

                setInterval(function() {
                    series.addData({ connections: privateMethods.charts.connectionsActivity.stack });
                    chart.update();
                }, 1000);

                privateMethods.socket.on('userConnect', function() {
                    privateMethods.charts.connectionsActivity.stack++;
                });
            }
        }
    };

    privateMethods.users = {
        init: function() {
            privateMethods.users.searchForm();
            privateMethods.users.tableActions();
        },
        searchForm: function() {
            $('#user-search').submit(function() {
                window.location = window.location.protocol + '//' + window.location.host + '/admin/users/' + encodeURIComponent($(this).find('input').val());
                return false;
            });
        },
        tableActions: function() {
            $('.dropdown-toggle').dropdown();
            $('#user-list .actions button.delete, #user-list .actions .dropdown-menu a').on('click', function() {
                var uid = $(this).parents('tr').attr('id');
                var withMessages = $(this)[0].tagName.toLowerCase() === 'a';
                bootbox.confirm('Вы уверены что хотите удалить пользователя' + (withMessages ? ' и его сообщения' : '') + '?', function(confirmed) {
                    if (!confirmed) return;
                    $.post('/admin/users/delete', {
                        _csrf:privateMethods.options.csrf,
                        uid:uid.substr(4, uid.length),
                        withMessages:withMessages
                    }).success(function (data) {
                        if (data.error) return $.fn.notifier(data.error);
                        $('#' + uid).fadeOut('fast', function () {
                            $(this).remove();
                        });
                    }).error(function () {
                        $.fn.notifier('Ошибка отправки данных.');
                    });
                });
                return false;
            });
        }
    };

    privateMethods.messages = {
        init:function () {
            privateMethods.messages.searchForm();
            privateMethods.messages.tableActions();
        },
        searchForm:function () {
            $('#message-search').submit(function () {
                window.location = window.location.protocol + '//' + window.location.host + '/admin/messages/' + encodeURIComponent($(this).find('input').val());
                return false;
            });
        },
        tableActions:function () {
            $('#message-list .actions button.delete').on('click', function() {
                var mid = $(this).parents('tr').attr('id');
                bootbox.confirm('Вы уверены что хотите удалить сообщение?', function(confirmed) {
                    if (!confirmed) return;
                    $.post('/admin/messages/delete', {
                        _csrf:privateMethods.options.csrf,
                        mid:mid.substr(4, mid.length)
                    }).success(function (data) {
                        if (data.error) return $.fn.notifier(data.error);
                        $('#' + mid).fadeOut('fast', function () {
                            $(this).remove();
                        });
                    }).error(function () {
                        $.fn.notifier('Ошибка отправки данных.');
                    });
                });
                return false;
            });
        }
    };

    privateMethods.init = function (admin) {
        $.extend(true, privateMethods, admin);

        if (!privateMethods.helpers.browserCheck()) {
            return alert('Внимание: ваш браузер устарел, для работы чата обновите его.');
        }

        privateMethods.systemConsole();

        if (privateMethods[privateMethods.options.section] && typeof privateMethods[privateMethods.options.section].init === 'function') {
            privateMethods[privateMethods.options.section].init();
        }
    };

    $.fn.admin = function(env, csrf, logServer, secretKey, section) {
        return instance ? instance : instance = new Admin({
            env: env,
            csrf: csrf,
            logServer: logServer,
            secretKey: secretKey,
            section: section
        });
    };
})(jQuery, window);