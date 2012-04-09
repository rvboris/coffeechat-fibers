(function($, window) {
    'use strict';

    var privateMethods = {};
    var instance;

    function Admin(options) {
        this.options = options;
        this.socket = io.connect(window.location.protocol + '//' + window.location.hostname + ':' + options.logserver + '/logs');
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

    privateMethods.messagesPerSecondGraph = {
        stack: 0,
        init: function() {
            var series = new Rickshaw.Series.FixedDuration([
                { name: 'messages', x: 0, y: 0 }
            ], new Rickshaw.Color.Palette({ scheme: 'spectrum14' }), {
                maxDataPoints: 30,
                timeInterval: 30000
            });

            var graph = new Rickshaw.Graph({
                element: document.querySelector('#chart-messages'),
                width: 800,
                height: 150,
                series: series,
                interpolation: 'cardinal',
                renderer: 'line',
                offset: 'value'
            });

            new Rickshaw.Graph.Axis.Time({ graph: graph });
            new Rickshaw.Graph.Axis.Y({ graph: graph });

            graph.onUpdate(function() {
                privateMethods.messagesPerSecondGraph.stack = 0;
            });

            graph.render();

            setInterval(function() {
                series.addData({ messages: privateMethods.messagesPerSecondGraph.stack });
                graph.update();
            }, 1000);

            privateMethods.socket.on('sendMessage', function () {
                privateMethods.messagesPerSecondGraph.stack++;
            });
        }
    };

    privateMethods.connectionsHeartBeatGraph = {
        stack: 0,
        init: function() {
            var series = new Rickshaw.Series.FixedDuration([
                { name: 'connections', x: 0, y: 0 }
            ], new Rickshaw.Color.Palette({ scheme: 'spectrum14' }), {
                maxDataPoints: 30,
                timeInterval: 30000
            });

            var graph = new Rickshaw.Graph({
                element: document.querySelector('#chart-connections'),
                width: 800,
                height: 150,
                series: series,
                interpolation: 'step-after',
                renderer: 'line',
                offset: 'value'
            });

            new Rickshaw.Graph.Axis.Time({ graph: graph });
            new Rickshaw.Graph.Axis.Y({ graph: graph });

            graph.onUpdate(function() {
                privateMethods.connectionsHeartBeatGraph.stack = 0;
            });

            graph.render();

            setInterval(function() {
                series.addData({ connections: privateMethods.connectionsHeartBeatGraph.stack });
                graph.update();
            }, 1000);

            privateMethods.socket.on('userConnect', function() {
                privateMethods.connectionsHeartBeatGraph.stack++;
            });
        }
    };

    privateMethods.init = function (admin) {
        $.extend(true, privateMethods, admin);

        if (!privateMethods.helpers.browserCheck()) {
            return alert('Внимание: ваш браузер устарел, для работы чата обновите его.');
        }

        privateMethods.systemConsole();
        privateMethods.messagesPerSecondGraph.init();
        privateMethods.connectionsHeartBeatGraph.init();
    };

    $.fn.admin = function(env, csrf, logserver, secretKey) {
        return instance ? instance : instance = new Admin({ env: env, csrf: csrf, logserver: logserver, secretKey: secretKey });
    };
})(jQuery, window);