var moment = require('moment');
var sync   = require('sync');
var nconf  = require('nconf');

module.exports = function (app) {
    nconf.use('file', { file: __dirname + '/../../config/' + app.set('argv').env + '.json' });

    return {
        name: 'system',
        userSubscribe: function (user) {
            app.set('log').debug('user "%s" subscribe', user.name);
            process.send({ cmd: 'event', msg: 'userSubscribe' });
        },
        guestSubscribe: function () {
            app.set('log').debug('guest subscribe');
            process.send({ cmd: 'event', msg: 'guestSubscribe' });
        },
        userUnsubscribe: function (user, subscription) {
            sync(function () {
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

                var channel = app.Channel.findById.sync(app.Channel, channelId, 'private name');

                if (channel && channel['private']) {
                    app.set('log').debug('remove channel "%s"', channel.name);
                    channel.remove.sync(channel);
                }
            }, function (err) {
                if (err) app.set('log').error(err.stack);
            });
        },
        userConnect: function (user, message) {
            var currentTime = new Date();

            sync(function () {
                app.Subscription.update.sync(app.Subscription, {
                    userId: user.id,
                    channelId: { $in: message.activeChannels }
                }, {
                    $set: { time: currentTime }
                }, {
                    upsert: false,
                    multi: true
                });

                app.Channel.update.sync(app.Channel, {
                    _id: { $in: message.activeChannels }
                }, {
                    $set: { lastaccess: currentTime }
                }, {
                    upsert: false,
                    multi: true
                });

                user.stats.fulltime += Math.round((currentTime.getTime() - user.stats.lastaccess.getTime()) / 1000);
                user.stats.lastaccess = currentTime;
                user.save.sync(user);
            }, function (err) {
                if (err) {
                    app.set('log').error(err.stack);
                    return;
                }

                app.set('log').debug('"%s" user subscriptions updated', user.name);
                process.send({ cmd: 'event', msg: 'userConnect' });
            });
        },
        guestConnect: function (message) {
            sync(function () {
                app.Channel.update.sync(app.Channel, {
                    _id: { $in: message.activeChannels }
                }, {
                    $set: { lastaccess: new Date() }
                }, {
                    upsert: false,
                    multi: true
                });
            }, function (err) {
                if (err) {
                    app.set('log').error(err.stack);
                    return;
                }
                process.send({ cmd: 'event', msg: 'guestConnect' });
            });
        },
        userSend: function (user, channel, message) {
            app.set('log').debug('user "%s" send message', user.name);

            sync(function () {
                if (channel['private']) return;
                if (channel.hidden) return;
                if (channel.password) return;
                if (user.isSystem()) return;

                app.set('helpers').elastic.sync(app.set('helpers'), 'index', nconf.get('elasticsearch').index, 'message', {
                    id: message.id,
                    userId: user.id,
                    channelId: channel.id,
                    text: message.text
                });

                app.set('log').debug('add message ID %s to ES index', message.id);
            }, function (err) {
                if (err) {
                    app.set('log').error(err.stack);
                    return;
                }

                process.send({ cmd: 'event', msg: 'sendMessage' });
            });
        },
        syncObject: {
            userUnsubscribe: function (userId, subscriptionId) {
                sync(function () {
                    app.set('events').emit('userUnsubscribe', app.User.findById.future(app.User, userId).result, app.Subscription.findById.future(app.Subscription, subscriptionId).result);
                }, function (err) {
                    if (err) {
                        app.set('log').error(err.stack);
                        return;
                    }

                    process.send({ cmd: 'event', msg: 'userUnsubscribe' });
                });
            }
        }
    }
};