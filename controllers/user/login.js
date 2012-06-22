var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        if (!req.body.user || !req.body.channels) {
            app.set('log').debug('user or channels not found');
            res.send(404);
            return;
        }

        var auth = req.body.user;
        var channels = req.body.channels;

        sync(function () {
            var user;
            var result;

            if (req.user.id !== '0') {
                app.set('faye').bayeux.getClient().publish('/user/' + req.user.id, {
                    token: app.set('serverToken'),
                    action: 're-entry'
                });
                return {
                    error: 'Вы уже вошли под именем "' + req.user.name + '", закройте предыдущую сессию'
                };
            }

            user = app.User.findOne.sync(app.User, { name: auth.name });

            if (user) {
                if (!user.authenticate(auth.password)) {
                    app.set('log').debug('invalid username or password');
                    return { error: 'Неверный логин или пароль' };
                }
            } else {
                user = new app.User({ name: auth.name, secret: auth.password });
                user.save.sync(user);

                app.set('syncServer').task('user', 'start');
                app.set('log').debug('new user is saved');
            }

            req.session.user = { id: user.id };

            for (var i = 0, newSubscriptions = [], userChannels = []; i < channels.length; i++) {
                result = app.set('helpers').channel.subscribe.sync(app.set('helpers').channel, user, channels[i]);
                if (result.error) return result;
                if (user.isSystem()) return { user: user };
                if (!result.update) {
                    newSubscriptions.push({
                        id: channels[i],
                        diff: 1,
                        count: app.Subscription.count.sync(app.Subscription, {
                            channelId: channels[i],
                            userId: { $nin: app.set('systemUserIds') }
                        }),
                        hidden: result.channel.hidden
                    });
                    if (!userChannels[channels[i]]) userChannels[channels[i]] = [];
                    userChannels[channels[i]].push({ name: user.name, gender: user.gender, status: user.status });
                }
            }

            return {
                user: app.set('helpers').user.createPrivate.sync(app.set('helpers').user, user),
                newSubscriptions: newSubscriptions,
                userChannels: userChannels
            };
        }, function (err, result) {
            if (err) {
                if (err.name && err.name === 'ValidationError') {
                    if (err.errors.name) {
                        res.send({ error: 'Имя должно быть от 3 до 15 знаков. Допускаются только русские и латинские буквы и цифры.' });
                        return;
                    }
                    if (err.errors.password) {
                        res.send({ error: 'Пароль должен быть от 6 до 30 символов' });
                        return;
                    }
                    res.send({ error: 'Недопустимые данные для входа/регистрации' });
                    return;
                }

                app.set('log').error(err.stack);
                res.send(500);
                return;
            }

            if (!result) {
                res.send(500);
                return;
            }

            if (result.error) {
                res.send(result);
                return;
            }

            if (result.newSubscriptions.length > 0) {
                (function publish (iteration) {
                    iteration = iteration || 0;
                    app.set('faye').bayeux.getClient().publish('/channel/' + result.newSubscriptions[iteration].id + '/users', {
                        token: app.set('serverToken'),
                        action: 'con',
                        users: result.userChannels[result.newSubscriptions[iteration].id]
                    }).callback(function () {
                        app.set('log').debug('user list updated');
                        iteration++;
                        if (iteration < result.newSubscriptions.length) {
                            publish(iteration);
                        } else {
                            app.set('faye').bayeux.getClient().publish('/channel-list', {
                                token: app.set('serverToken'),
                                action: 'upd',
                                channels: result.newSubscriptions.map(function (channel) {
                                    if (!channel.hidden) {
                                        delete channel.hidden;
                                        return channel;
                                    }
                                })
                            }).callback(function () {
                                app.set('log').debug('channel list updated');
                            });
                        }
                    });
                })();
            }

            if (result.user) {
                res.send(app.set('helpers').user.createPrivate.sync(app.set('helpers').user, result.user));
                return;
            }

            res.send(500);
        });
    };
};