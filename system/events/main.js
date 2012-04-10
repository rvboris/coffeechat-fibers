var moment = require('moment');
var sync   = require('sync');

module.exports = function(app) {
    return {
        name: 'system',
        userSubscribe: function(user) {
            app.set('log').debug('user "%s" subscribe', user.name);
            process.send({ cmd: 'event', msg: 'userSubscribe' });
        },
        guestSubscribe: function() {
            app.set('log').debug('guest subscribe');
            process.send({ cmd: 'event', msg: 'guestSubscribe' });
        },
        userUnsubscribe: function(user, subscription) {
            sync(function() {
                var channelId = subscription.channelId.toHexString();

                app.set('log').debug('subscription to remove - time: %s, current: %s, diff: %s s.', moment(subscription.time).format('mm:ss'), moment().format('mm:ss'), ((new Date() - subscription.time) / 1000));

                subscription.remove.sync(subscription);

                app.set('log').debug('user "%s" unsubscribe', user.name);

                if (app.Subscription.count.sync(app.Subscription, { userId: user.id }) === 0 && user.status !== 'F') {
                    user.status = 'F';
                    user.save.sync(user);
                }

                if (app.Subscription.count.sync(app.Subscription, { channelId: channelId }) > 0) return;

                var persistent = false;

                for (var channelName in app.set('channels')) {
                    if (app.set('channels')[channelName].channelId === channelId && app.set('channels')[channelName].persistent) {
                        persistent = true;
                        break;
                    }
                }

                if (persistent) return;

                var channel = app.Channel.findById.sync(app.Channel, channelId, ['private', 'name']);

                if (channel && channel['private']) {
                    app.set('log').debug('remove channel "%s"', channel.name);
                    channel.remove.sync(channel);
                }
            }, function(err) {
                if (err) app.set('log').error(err.stack);
            });
        },
        userConnect: function(user, message) {
            sync(function() {
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

            }, function(err) {
                if (err) return app.set('log').error(err.stack);
                app.set('log').debug('"%s" user subscriptions updated', user.name);
                process.send({ cmd: 'event', msg: 'userConnect' });
            });
        },
        userSend: function(user) {
            app.set('log').debug('user "%s" send message', user.name);

            sync(function() {
                user.stats.messages++;
                user.save.sync(user);
            }, function(err) {
                if (err) return app.set('log').error(err.stack);
                process.send({ cmd: 'event', msg: 'sendMessage' });
            });
        },
        syncObject: {
            userUnsubscribe: function(userId, subscriptionId) {
                sync(function() {
                    app.set('events').emit('userUnsubscribe', app.User.findById.future(app.User, userId).result, app.Subscription.findById.future(app.Subscription, subscriptionId).result);
                }, function(err) {
                    if (err) return app.set('log').error(err.stack);
                    process.send({ cmd: 'event', msg: 'userUnsubscribe' });
                });
            }
        }
    }
};