var sync    = require('sync');
var events  = require('events');
var eventer = new events.EventEmitter();
var path    = require('path');

module.exports = function (app) {
    var eventFiles = app.set('helpers').plugins.sync(app.set('helpers').plugins, path.normalize(__dirname + '/events'), path.normalize(__dirname + '/../plugins'), /(events\/|\/events.js)/);
    var events = [];

    for (var i = 0; i < eventFiles.length; i++) {
        events.push(require(eventFiles[i])(app));
    }

    eventer.setMaxListeners(6);

    eventer.on('userUnsubscribe', function (user, subscription) {
        for (var i = 0; i < events.length; i++) {
            if (events[i].userUnsubscribe && typeof events[i].userUnsubscribe === 'function') {
                events[i].userUnsubscribe(user, subscription);
            }
        }
    });

    eventer.on('guestSubscribe', function (channel) {
        for (var i = 0; i < events.length; i++) {
            if (events[i].guestSubscribe && typeof events[i].guestSubscribe === 'function') {
                events[i].guestSubscribe(channel);
            }
        }
    });

    eventer.on('userSend', function (user, channel, message) {
        for (var i = 0; i < events.length; i++) {
            if (events[i].userSend && typeof events[i].userSend === 'function') {
                events[i].userSend(user, channel, message);
            }
        }
    });

    eventer.on('userSubscribe', function (user, channel) {
        for (var i = 0; i < events.length; i++) {
            if (events[i].userSubscribe && typeof events[i].userSubscribe === 'function') {
                events[i].userSubscribe(user, channel);
            }
        }
    });

    eventer.on('userConnect', function (user, message) {
        for (var i = 0; i < events.length; i++) {
            if (events[i].userConnect && typeof events[i].userConnect === 'function') {
                events[i].userConnect(user, message);
            }
        }
    });

    eventer.on('syncEvent', function (plugin, command) {
        var args = Array.prototype.slice.call(arguments);
        args.shift();
        args.shift();

        for (var i = 0; i < events.length; i++) {
            if (events[i].name === plugin && events[i].syncObject && typeof events[i].syncObject[command] === 'function') {
                events[i].syncObject[command].apply(events[i].syncObject[command], args);
                break;
            }
        }
    });

    app.set('log').debug('events handler loaded');

    return eventer;
}.async();