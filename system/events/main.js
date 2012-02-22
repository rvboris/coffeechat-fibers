var moment = require('moment');
var sync   = require('sync');

module.exports = function(app) {
    return {
        name: 'system',
        userSubscribe: function(user) {
            app.set('log').debug('user "%s" subscribe', user.name);
        },
        guestSubscribe: function() {
            app.set('log').debug('guest subscribe');
        },
        userUnsubscribe: function(user, subscription) {
            sync(function() {
                var channelId = subscription.channelId.toHexString();

                app.set('log').debug('subscription to remove - time: %s, current: %s, diff: %d s.', moment(subscription.time).format('mm:ss'), moment().format('mm:ss'), ((new Date() - subscription.time) / 1000));

                subscription.remove.sync(subscription);

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
            });
        },
        userSend: function(user) {
            app.set('log').debug('user "%s" send message', user.name);

            sync(function() {
                user.stats.messages++;
                user.save.sync(user);
            }, function(err) {
                if (err) app.set('log').error(err.stack);
            });
        },
        syncObject: {
            userUnsubscribe: function(userId, subscriptionId) {
                sync(function() {
                    return sync.Parallel(function(callback) {
                        app.User.findById(userId, callback('user'));
                        app.Subscription.findById(subscriptionId, callback('subscription'));
                    });
                }, function(err, result) {
                    if (err) return app.set('log').error(err.stack);
                    app.set('events').emit('userUnsubscribe', result.user, result.subscription);
                });
            }
        }
    }
};