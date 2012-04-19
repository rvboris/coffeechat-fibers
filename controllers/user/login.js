var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        if (!req.isXMLHttpRequest) {
            res.send(401);
            return;
        }

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

            if (req.session.user && req.session.user.id !== '0') {
                user = app.User.findById.sync(app.User, req.session.user.id);
                if (user) {
                    app.set('faye').bayeux.getClient().publish('/user/' + user.id, {
                        token: app.set('serverToken'),
                        action: 're-entry'
                    });
                    return {
                        error: 'Вы уже вошли под именем "' + user.name + '", закройте предыдущую сессию'
                    };
                }
            }

            user = app.User.findOne.sync(app.User, { name: auth.name });

            if (user) {
                if (!user.authenticate(auth.password)) {
                    app.set('log').debug('invalid username or password');
                    return { error: 'Неверный логин или пароль' };
                }
            } else {
                if (auth.password && (auth.password.length < 6 || auth.password.length > 30)) {
                    return { error: 'Недопустимый размер пароля' };
                }

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
                        })
                    });
                    if (!userChannels[channels[i]]) userChannels[channels[i]] = [];
                    userChannels[channels[i]].push({ name: user.name, gender: user.gender, status: user.status });
                }
            }

            return { user: user, newSubscriptions: newSubscriptions, userChannels: userChannels };
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

            if (result.newSubscriptions) {
                setTimeout(function () {
                    app.set('faye').bayeux.getClient().publish('/channel-list', {
                        token: app.set('serverToken'),
                        action: 'upd',
                        channels: result.newSubscriptions
                    });
                }, 100);

                for (var i = 0; i < result.newSubscriptions.length; i++) {
                    (function (i) {
                        setTimeout(function () {
                            app.set('faye').bayeux.getClient().publish('/channel/' + result.newSubscriptions[i].id + '/users', {
                                token: app.set('serverToken'),
                                action: 'con',
                                users: result.userChannels[result.newSubscriptions[i].id]
                            });
                        }, 100 + (10 * i));
                    })(i);
                }
            }

            if (result.user) {
                res.send(app.set('helpers').user.createPrivate(result.user));
                return;
            }

            res.send(500);
        });
    };
};