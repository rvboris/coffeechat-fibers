var aes  = require('../helpers/aes.js');
var sync = require('sync');

module.exports = function (app) {
    app.set('log').debug('bayeux core loaded');

    return {
        incoming: function (message, callback) {
            var token = app.set('helpers').channel.getToken(message);
            var currentTime = new Date();

            if (!token) {
                // Service commands
                switch (message.channel) {
                    case '/meta/handshake':
                    case '/meta/connect':
                    case '/meta/disconnect':
                        callback(message);
                        return;
                }
                // Other require token
                message.error = 'Доступ запрещен';
                app.set('log').debug('access denied');
                callback(message);
                return;
            }

            if (message.token) delete message.token;
            if (message.data && message.data.token) delete message.data.token;

            // Sender is server
            if (token === app.set('serverToken')) {
                app.set('log').debug('sent from the server');

                if (message.data && message.data.text) {
                    message.data.text = aes.enc(message.data.text, app.set('serverKey'));
                    message.data.time = currentTime;
                }

                callback(message);
                return;
            }

            sync(function () {
                var matches;
                var channel;

                // Is guest
                if (token === '0') {
                    app.set('log').debug('guest login through the token');

                    // Send message
                    if (message.data) {
                        app.set('log').debug('guests can not send messages');
                        message.error = 'Гости не могут отправлять сообщения';
                        return;
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
                            message.error = 'Комната не найдена';
                            return;
                        }

                        channel = app.Channel.findById.sync(app.Channel, matches[1]);

                        if (!channel) {
                            app.set('log').debug('channel not found');
                            message.error = 'Комната не найдена';
                            return;
                        }

                        if (channel['private'] || channel['password']) {
                            app.set('log').debug('guests have access only to the public channels');
                            message.error = 'Гости имеют доступ только к публичным комнатам';
                            return;
                        }

                        app.set('events').emit('guestSubscribe', message);
                    }
                } else { // Is user
                    var user = app.User.findById.sync(app.User, token);

                    if (!user) {
                        app.set('log').debug('invalid user token "%s"', token);
                        message.error = 'Ключ не верный';
                        return;
                    }

                    app.set('log').debug('user login through the token');

                    var channelId;
                    var subscription;

                    // Send message
                    if (message.data) {
                        matches = message.channel.match(/(?:^\/channel\/)([0-9a-z]+)(?:\/private)?$/);

                        if (matches === null || matches.length < 2) {
                            app.set('log').debug('unknown channel');
                            message.error = 'Комната не найдена';
                            return;
                        }

                        channelId = matches[1];
                        subscription = app.Subscription.count.sync(app.Subscription, {
                            userId: token,
                            channelId: channelId
                        });

                        if (subscription === 0) {
                            app.set('log').debug('not subscribe on this channel');
                            message.error = 'Доступ запрещен';
                            return;
                        }

                        channel = app.Channel.findById.sync(app.Channel, channelId, ['url', 'private']);

                        if (!channel) {
                            app.set('log').debug('channel not found');
                            message.error = 'Ошибка отправки, комната не найдена';
                            return;
                        }

                        if (message.data.action) {
                            switch (message.data.action) {
                                case 'type':
                                    matches = message.channel.match(/(?:^\/channel\/)([0-9a-z]+)(?:\/private)$/);
                                    if (!channel['private'] || matches === null || matches.length < 2) {
                                        app.set('log').debug('type action on public channel');
                                        message.error = 'Ошибка отправки';
                                        return;
                                    }
                                    message.data.name = user.name;
                            }
                            return;
                        }

                        if (!message.data.text) {
                            app.set('log').debug('message is empty');
                            message.error = 'Ошибка отправки, сообщение пустое';
                            return;
                        }

                        try {
                            var decodedText = aes.dec(message.data.text, app.set('serverKey') + user.id);
                        } catch (e) {
                            app.set('log').debug('message decoding error');
                            message.error = 'Ошибка декодирования сообщения';
                            return;
                        }

                        if (!user.isSystem()) {
                            var query = app.Message.findOne({ userId: user.id }, ['time']).sort('time', -1);
                            var lastMessage = query.execFind.sync(query);

                            if (lastMessage.length > 0 && new Date().getTime() - lastMessage[0].time.getTime() <= 3000) {
                                message.error = 'Сообщения можно отправлять не чаще чем раз в 3 секунды';
                                return;
                            }
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
                                message.error = 'Кому вы отправляете?';
                                return;
                            }
                        }

                        if (!user.isSystem()) {
                            if (app.set('channels')[channel.url]) {
                                if (app.set('channels')[channel.url].params.history) {
                                    msg.save.sync(msg);
                                } else {
                                    msg.validate.sync(msg);
                                }
                            } else if (!channel['private'] && !channel['password']) {
                                msg.save.sync(msg);
                            } else {
                                msg.validate.sync(msg);
                            }
                        }

                        message.data.text = aes.enc(msg.parsed, app.set('serverKey'));
                        message.data.name = user.isSystem() ? '$' : user.name;
                        message.data.time = currentTime;

                        app.set('events').emit('userSend', user, channel, msg);
                        return;
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
                                message.error = 'Комната не найдена';
                                return;
                            }
                            matches = message.subscription.match(/(?:^\/(channel)\/)([0-9a-z]+)(?:\/private)$/);
                            if (matches !== null && matches.length >= 2) {
                                channel = app.Channel.findById.sync(app.Channel, matches[2]);
                                if (!channel || !channel['private']) {
                                    app.set('log').debug('try to subscribe to private sub channel of public or not exists channel');
                                    message.error = 'Ошибка подписки';
                                    return;
                                }
                            }
                            return;
                        }

                        if (!channel) {
                            channel = app.Channel.findById.sync(app.Channel, matches[1]);
                        }

                        if (channel.password && channel.owner.toHexString() !== user.id) {
                            if (!message.password) {
                                app.set('log').debug('access denied, password not found');
                                message.error = 'Для этой комнаты требуется пароль';
                                return;
                            } else if (!channel.authenticate(message.password)) {
                                app.set('log').debug('access denied, wrong password');
                                message.error = 'Доступ запрещен, неверный пароль';
                                return;
                            }
                        }

                        var result = app.set('helpers').channel.subscribe.sync(app.set('helpers').channel, user, channel.id);

                        if (result.error) {
                            message.error = result.error;
                            return;
                        }

                        if (!result.update && !user.isSystem()) {
                            var subscriptionsCount = app.Subscription.count.sync(app.Subscription, {
                                channelId: channel.id,
                                userId: { $nin: app.set('systemUserIds') }
                            });

                            app.set('faye').bayeux.getClient().publish('/channel/' + channel.id + '/users', {
                                token: app.set('serverToken'),
                                action: 'con',
                                users: [
                                    { name: user.name, gender: user.gender, status: user.status }
                                ]
                            }).callback(function () {
                                if (!channel.hidden) {
                                    app.set('faye').bayeux.getClient().publish('/channel-list', {
                                        token: app.set('serverToken'),
                                        action: 'upd',
                                        channels: [
                                            { id: channel.id, diff: 1, count: subscriptionsCount }
                                        ]
                                    });
                                }
                            });
                        }

                        app.set('events').emit('userSubscribe', user, result.channel, result.subscription);
                        return;
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
                                message.error = 'Комната не найдена';
                                return;
                            }
                            matches = message.subscription.match(/(?:^\/(channel)\/)([0-9a-z]+)(?:\/private)$/);
                            if (matches !== null && matches.length >= 2) {
                                channel = app.Channel.findById.sync(app.Channel, matches[2]);
                                if (!channel || !channel['private']) {
                                    app.set('log').debug('try to unsubscribe from private sub channel of public or not exists channel');
                                    message.error = 'Ошибка отписки';
                                    return;
                                }
                            }
                            return;
                        }

                        channelId = matches[1];

                        if (!channel) {
                            channel = app.Channel.findById.sync(app.Channel, channelId);
                        }

                        subscription = app.Subscription.findOne.sync(app.Subscription, {
                            channelId: channelId,
                            userId: user.id
                        });

                        if (!subscription) {
                            app.set('log').debug('subscription not found');
                            message.error = 'Ошибка отписки';
                            return;
                        }

                        app.set('events').emit('userUnsubscribe', user, subscription);

                        if (!channel) return;

                        if (!user.isSystem()) {
                            app.set('faye').bayeux.getClient().publish('/channel/' + subscription.channelId.toHexString() + '/users', {
                                token: app.set('serverToken'),
                                action: 'dis',
                                users: [
                                    { name: user.name }
                                ]
                            }).callback(function () {
                                app.set('log').debug('user list updated');

                                if (!channel.hidden) {
                                    app.set('faye').bayeux.getClient().publish('/channel-list', {
                                        token: app.set('serverToken'),
                                        action: 'upd',
                                        channels: [
                                            {
                                                id: subscription.channelId.toHexString(),
                                                diff: -1,
                                                count: app.Subscription.count.sync(app.Subscription, {
                                                    channelId: subscription.channelId,
                                                    userId: { $nin: app.set('systemUserIds') }
                                                })
                                            }
                                        ]
                                    }).callback(function () {
                                        app.set('log').debug('channel list updated');
                                    });
                                }
                            });
                        }
                    }

                    // Connecting
                    if (message.channel === '/meta/connect') {
                        app.set('log').debug('user "%s" is connected', user.name);

                        if (!message.activeChannels || message.activeChannels.length === 0) return;

                        app.set('syncServer').task('collector', 'start');
                        app.set('events').emit('userConnect', user, message);
                    }
                }
            }, function (err) {
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
        }
    }
};