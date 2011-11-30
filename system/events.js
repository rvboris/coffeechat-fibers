var sync    = require('sync');
var events  = require('events');
var moment  = require('moment');
var eventer = new events.EventEmitter();

module.exports = function (app) {
    eventer.on('userUnsubscribe', function (user, subscription, num) {
        if (!num) num = 0;

        sync(function () {
            var channelId = subscription.channelId.toHexString();

            app.set('log').debug('subscription to remove - time: ' + moment(subscription.time).format('mm:ss') + ', current: ' + moment.format('mm:ss') + ', diff: ' + ((new Date() - subscription.time) / 1000) + 's.');

            subscription.remove.sync(subscription);

            if (app.Subscription.find.sync(app.Subscription, { userId: user.id }).length == 0 && user.status != 'F') {
                user.status = 'F';
                user.save.sync(user);
            }

            if (app.Subscription.count.sync(app.Subscription, { channelId: channelId }) > 0) return;

            switch (channelId) {
                case app.set('mainChannel').id:
                case app.set('quizetonChannel').id:
                case app.set('xxxChannel').id:
                    return;
            }

            var channel = app.Channel.findById.sync(app.Channel, channelId);

            if (channel && channel.private) {
                app.set('log').debug('remove channel "' + channel.name + '"');
                channel.remove.sync(channel);
            }
        }, function (err) {
            if (err) app.set('log').error(err.stack);
        });
    });

    eventer.on('guestSubscribe', function (channel) {
        app.set('log').debug('guest subscribe');

        if (channel.id == app.set('quizetonChannel').id) {
            app.set('syncServer').quizeton.getStatus(function(status) {
                if (status != 'stop') return;
                app.set('faye').bayeux.getClient().publish('/channel/' + app.set('quizetonChannel').id, {
                    token: app.set('serverToken'),
                    text: 'Чтобы начать игру необходимо авторизироваться.',
                    name: '$'
                });
            });
        }
    });

    eventer.on('userSend', function (user, channel, text) {
        app.set('log').debug('user "' + user.name + '" send message');

        sync(function () {
            user.stats.messages++;
            user.save.sync(user);
        }, function (err) {
            if (err) app.set('log').error(err.stack);
        });

        if (channel.id == app.set('quizetonChannel').id) {
            app.set('syncServer').quizeton.getAnswer(function(answer) {
                if (text.toLowerCase() != answer.toLowerCase()) return;
                app.set('syncServer').quizeton.newQuiz(user.id);
            });
        }
    });

    eventer.on('userSubscribe', function (user, channel) {
        app.set('log').debug('user "' + user.name + '" subscribe');

        if (channel.id == app.set('quizetonChannel').id) {
            app.set('syncServer').quizeton.start();
        }
    });

    eventer.on('userConnect', function (user, message) {
        sync(function () {
            var subscriptions = app.Subscription.find.sync(app.Subscription, {
                userId: user.id,
                channelId: {
                    $in: message.activeChannels
                }
            });

            for (var i = 0; i < subscriptions.length; i++) {
                subscriptions[i].time = new Date();
                subscriptions[i].save.sync(subscriptions[i]);
            }

            user.stats.fulltime += Math.round((new Date().getTime() - user.stats.lastaccess.getTime()) / 1000);
            user.stats.lastaccess = new Date();
            user.save.sync(user);
        }, function (err) {
            if (err) return app.set('log').error(err.stack);
            app.set('log').debug('"' + user.name + '" user subscriptions updated');
        });
    });

    app.set('log').debug('bayeux events handler loaded');

    return eventer;
};