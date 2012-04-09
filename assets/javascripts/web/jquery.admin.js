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

    privateMethods.messagesGraph = function () {
        var data = new Rickshaw.Series([{
            name:"Northeast",
            data:[
                { x: new Date().getTime(), y:1 },
                { x: new Date().getTime()+10, y:1 }
            ],
            color:new Rickshaw.Color.Palette()
        }]);


        var graph = new Rickshaw.Graph({
            element: document.querySelector('#chart-messages .chart'),
            width: 800,
            height: 300,
            series: data
        });

        new Rickshaw.Graph.Axis.Time( { graph: graph } );

        new Rickshaw.Graph.Axis.Y({
            graph:graph,
            orientation:'left',

            element:document.querySelector('#chart-messages .y-axis')
        });

        new Rickshaw.Graph.HoverDetail({
            graph:graph
        });

        graph.render();

        setInterval(function(){
            graph.series.addData({ x: new Date().getTime() });
            graph.update();
        },1000);

    };

    privateMethods.subscriptionsGraph = function () {

    };

    privateMethods.init = function (admin) {
        $.extend(true, privateMethods, admin);

        if (!privateMethods.helpers.browserCheck()) {
            return alert('Внимание: ваш браузер устарел, для работы чата обновите его.');
        }

        privateMethods.systemConsole();
        privateMethods.messagesGraph();
    };

    $.fn.admin = function(env, csrf, logserver, secretKey) {
        return instance ? instance : instance = new Admin({ env: env, csrf: csrf, logserver: logserver, secretKey: secretKey });
    };
})(jQuery, window);