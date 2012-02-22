var aes  = require('../helpers/aes.js');
var sync = require('sync');

module.exports = function(app) {
    app.set('log').debug('bayeux core loaded');

    return {
        incoming: function(message, callback) {
            var token = app.set('helpers').channel.getToken(message);
            var currentTime = new Date();

            if (!token) {
                // Service commands
                switch (message.channel) {
                    case '/meta/handshake':
                    case '/meta/connect':
                    case '/meta/disconnect':
                        return callback(message);
                }
                // Other require token
                message.error = 'Доступ запрещен';
                app.set('log').debug('access denied');
                return callback(message);
            }

            // Sender is server
            if (token === app.set('serverToken')) {
                app.set('log').debug('sent from the server');
                return callback(message);
            }

            sync(function() {
                var matches;
                var channel;

                // Is guest
                if (token === '0') {
                    app.set('log').debug('guest login through the token');

                    // Send message
                    if (message.data) {
                        app.set('log').debug('guests can not send messages');
                        return message.error = 'Гости не могут отправлять сообщения';
                    }

                    // Subscribe
                    if (message.channel === '/meta/subscribe') {
                        // Allow channels
                        switch (message.subscription) {
                            case '/channel-list':
                                return;
                        }

                        matches = message.subscription.match(/(?:^\/channel\/)([0-9a-z]+)(?:\/users)?$/);

                        if (matches === null || matches.length < 2) {
                            app.set('log').debug('unknown channel');
                            return message.error = 'Комната не найдена';
                        }

                        channel = app.Channel.findById.sync(app.Channel, matches[1]);

                        if (!channel) {
                            app.set('log').debug('channel not found');
                            return message.error = 'Комната не найдена';
                        }

                        if (channel['private']) {
                            app.set('log').debug('guests have access only to the main chat');
                            return message.error = 'Гости имеют доступ только к публичным комнатам';
                        }

                        app.set('events').emit('guestSubscribe', message);
                    }
                } else { // Is user
                    var user = app.User.findById.sync(app.User, token);

                    if (!user) {
                        app.set('log').debug('invalid user token "%s"', token);
                        return message.error = 'Ключ не верный';
                    }

                    app.set('log').debug('user login through the token');

                    var channelId;
                    var subscription;

                    // Send message
                    if (message.data) {
                        matches = message.channel.match(/(?:^\/channel\/)([0-9a-z]+)(?:\/private)?$/);

                        if (matches === null || matches.length < 2) {
                            app.set('log').debug('unknown channel');
                            return message.error = 'Комната не найдена';
                        }

                        channelId = matches[1];
                        subscription = app.Subscription.count.sync(app.Subscription, { userId: token, channelId: channelId });

                        if (subscription === 0) {
                            app.set('log').debug('not subscribe on this channel');
                            return message.error = 'Доступ запрещен';
                        }

                        channel = app.Channel.findById.sync(app.Channel, channelId, ['url', 'private']);

                        if (!channel) {
                            app.set('log').debug('channel not found');
                            return message.error = 'Ошибка отправки, комната не найдена';
                        }

                        if (message.data.action) {
                            switch (message.data.action) {
                                case 'type':
                                    matches = message.channel.match(/(?:^\/channel\/)([0-9a-z]+)(?:\/private)$/);
                                    if (!channel['private'] || matches === null || matches.length < 2) {
                                        app.set('log').debug('type action on public channel');
                                        return message.error = 'Ошибка отправки';
                                    }
                                    message.data.name = user.name;
                            }
                            return;
                        }

                        if (!message.data.text) {
                            app.set('log').debug('message is empty');
                            return message.error = 'Ошибка отправки, сообщение пустое';
                        }

                        try {
                            var decodedText = aes.dec(message.data.text, app.set('serverKey') + user.id);
                        } catch (e) {
                            app.set('log').debug('message decoding error');
                            return message.error = 'Ошибка декодирования сообщения';
                        }

                        var query = app.Message.findOne({ userId: user.id }, ['time']).sort('time', -1);
                        var lastMessage = query.execFind.sync(query);

                        if (lastMessage.length > 0 && new Date().getTime() - lastMessage[0].time.getTime() <= 3000) {
                            return message.error = 'Сообщения можно отправлять не чаще чем раз в 3 секунды';
                        }

                        var msg = new app.Message({
                            userId: user.id,
                            channelId: channelId,
                            time: currentTime,
                            txt: decodedText
                        });

                        msg.parsed = msg.parseText(decodedText);

                        if (message.data.to && message.data.to.length > 0) {
                            if (message.data.to.length > 3) {
                                message.data.to.length = 3;
                            }

                            msg.to = msg.formatTo(message.data.to);

                            var users = app.User.find.sync(app.User, { name: { $in: message.data.to } }, []);

                            if (users.length !== message.data.to.length) {
                                app.set('log').debug('users in the message is not found');
                                return message.error = 'Кому вы отправляете?';
                            }
                        }

                        if (app.set('channels')[channel.url]) {
                            if (app.set('channels')[channel.url].params.history) {
                                msg.save.sync(msg);
                            } else {
                                msg.validate.sync(msg);
                            }
                        } else if (!channel['private']) {
                            msg.save.sync(msg);
                        } else {
                            msg.validate.sync(msg);
                        }

                        message.data.text = aes.enc(msg.parsed, app.set('serverKey'));
                        message.data.name = user.name;

                        return app.set('events').emit('userSend', user, channel, decodedText);
                    }

                    // Subscribe
                    if (message.channel === '/meta/subscribe') {
                        // Allow channels
                        switch (message.subscription) {
                            case '/channel-list':
                                return;
                        }

                        matches = message.subscription.match(/(?:^\/channel\/)([0-9a-z]+)$/);

                        if (matches === null || matches.length < 2) {
                            matches = message.subscription.match(/(?:^\/(channel|user)\/)([0-9a-z]+)(?:\/(users|private))?$/);
                            if (matches === null || matches.length < 2) {
                                app.set('log').debug('unknown channel');
                                return message.error = 'Комната не найдена';
                            }
                            matches = message.subscription.match(/(?:^\/(channel)\/)([0-9a-z]+)(?:\/private)$/);
                            if (matches !== null && matches.length >= 2) {
                                channel = app.Channel.findById.sync(app.Channel, matches[2]);
                                if (!channel || !channel['private']) {
                                    app.set('log').debug('try to subscribe to private sub channel of public or not exists channel');
                                    return message.error = 'Ошибка подписки';
                                }
                            }
                            return;
                        }

                        var result = app.set('helpers').channel.subscribe.sync(app.set('helpers').channel, user, matches[1]);
                        if (result.error) return message.error = result.error;

                        if (!result.update) {
                            var subscriptionsCount = app.Subscription.count.sync(app.Subscription, { channelId: matches[1]});

                            // Execute on other thread (double send bug)
                            setTimeout(function() {
                                app.set('faye').bayeux.getClient().publish('/channel-list', {
                                    token: app.set('serverToken'),
                                    action: 'upd',
                                    channels: [
                                        { id: matches[1], diff: 1, count: subscriptionsCount }
                                    ]
                                });

                                app.set('log').debug('channel list updated');

                                app.set('faye').bayeux.getClient().publish('/channel/' + matches[1] + '/users', {
                                    token: app.set('serverToken'),
                                    action: 'con',
                                    users: [
                                        { name: user.name, gender: user.gender, status: user.status }
                                    ]
                                });

                                app.set('log').debug('user list updated');
                            }, 100);
                        }

                        return app.set('events').emit('userSubscribe', user, result.channel, result.subscription);
                    }

                    // Unsubscribe
                    if (message.channel === '/meta/unsubscribe') {
                        // Allow channels
                        switch (message.subscription) {
                            case '/channel-list':
                                return;
                        }

                        matches = message.subscription.match(/(?:^\/channel\/)([0-9a-z]+)$/);

                        if (matches === null || matches.length < 2) {
                            matches = message.subscription.match(/(?:^\/(channel|user)\/)([0-9a-z]+)(?:\/(users|private))?$/);
                            if (matches === null || matches.length < 2) {
                                app.set('log').debug('unknown channel');
                                return message.error = 'Комната не найдена';
                            }
                            matches = message.subscription.match(/(?:^\/(channel)\/)([0-9a-z]+)(?:\/private)$/);
                            if (matches !== null && matches.length >= 2) {
                                channel = app.Channel.findById.sync(app.Channel, matches[2]);
                                if (!channel || !channel['private']) {
                                    app.set('log').debug('try to unsubscribe from private sub channel of public or not exists channel');
                                    return message.error = 'Ошибка отписки';
                                }
                            }
                            return;
                        }

                        channelId = matches[1];

                        subscription = app.Subscription.findOne.sync(app.Subscription, { channelId: channelId, userId: user.id });

                        if (!subscription) {
                            app.set('log').debug('subscription not found');
                            return message.error = 'Комната не найдена';
                        }

                        app.set('events').emit('userUnsubscribe', user, subscription);

                        app.set('faye').bayeux.getClient().publish('/channel-list', {
                            token: app.set('serverToken'),
                            action: 'upd',
                            channels: [
                                {
                                    id: subscription.channelId.toHexString(),
                                    diff: -1,
                                    count: app.Subscription.count.sync(app.Subscription, { channelId: subscription.channelId })
                                }
                            ]
                        });

                        app.set('log').debug('channel list updated');

                        // Execute on other thread (double send bug)
                        setTimeout(function() {
                            app.set('faye').bayeux.getClient().publish('/channel/' + subscription.channelId.toHexString() + '/users', {
                                token: app.set('serverToken'),
                                action: 'dis',
                                users: [
                                    { name: user.name }
                                ]
                            });

                            app.set('log').debug('user list updated');
                        }, 100);
                    }

                    // Connecting
                    if (message.channel === '/meta/connect') {
                        app.set('log').debug('user "%s" is connected', user.name);

                        if (!message.activeChannels || message.activeChannels.length === 0) return;

                        app.set('syncServer').task('collector', 'start');

                        return app.set('events').emit('userConnect', user, message);
                    }
                }
            }, function(err) {
                if (err) {
                    if (err.name && err.name === 'ValidationError') {
                        if (err.errors.text) {
                            message.error = 'Сообщение содержит недопустимые символы';
                        } else {
                            message.error = 'Недопустимые данные сообщения';
                        }
                    } else {
                        app.set('log').error(err.stack);
                        message.error = 'Неизвестная ошибка';
                    }
                }
                callback(message);
            });
        },
        outgoing: function(message, callback) {
            if (message.channel.substr(1, 7) === 'channel' && message.data && message.data.text) {
                if (message.token === app.set('serverToken') || message.data.token === app.set('serverToken')) {
                    message.data.text = aes.enc(message.data.text, app.set('serverKey'));
                }
                if (!message.data.time) message.data.time = new Date();
                if (message.token) delete message.token;
                if (message.data.token) delete message.data.token;
            }

            callback(message);
        }
    }
};