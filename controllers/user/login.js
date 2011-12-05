var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        if (!req.isXMLHttpRequest) return res.send(401);

        if (!req.body.user || !req.body.channels) {
            app.set('log').debug('user or channels not found');
            return res.send(404);
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
                        token:app.set('serverToken'),
                        action:'re-entry'
                    });
                    return {
                        error:'Вы уже вошли под именем "' + user.name + '", закройте предыдущую сессию'
                    };
                }
            }

            user = app.User.findOne.sync(app.User, { name:auth.name });

            if (user) {
                if (!user.authenticate(auth.password)) {
                    app.set('log').debug('invalid username or password');
                    return { error:'Неверный логин или пароль' };
                }
            } else {
                if (auth.password && (auth.password.length < 6 || auth.password.length > 30)) {
                    return { error:'Недопустимый размер пароля' };
                }

                user = new app.User({ name:auth.name, secret:auth.password });
                user.save.sync(user);
                app.set('log').debug('new user is saved');
            }

            req.session.user = { id:user.id };

            for (var i = 0, newSubscriptions = [], userChannels = []; i < channels.length; i++) {
                result = app.set('helpers').channel.subscribe.sync(app.set('helpers').channel, user, channels[i]);
                if (result.error) return result;
                if (!result.update) {
                    newSubscriptions.push({
                        id:channels[i],
                        diff:1,
                        count:app.Subscription.count.sync(app.Subscription, { channelId:channels[i] })
                    });
                    if (!userChannels[channels[i]]) {
                        userChannels[channels[i]] = [];
                    }
                    userChannels[channels[i]].push({ name:user.name, gender:user.gender, status:user.status });
                }
            }

            return { user:user, newSubscriptions:newSubscriptions, userChannels:userChannels };
        }, function (err, result) {
            if (err) {
                if (err.name && err.name === 'ValidationError') {
                    if (err.errors.name) {
                        return res.send({ error:'Имя должно быть от 3 до 15 знаков. Допускаются только русские и латинские буквы и цифры.' });
                    }
                    if (err.errors.password) {
                        return res.send({ error:'Пароль должен быть от 6 до 30 символов' });
                    }
                    return res.send({ error:'Недопустимые данные для входа/регистрации' });
                }

                app.set('log').error(err.stack);
                return res.send(500);
            }

            if (!result) return res.send(500);

            if (result.error) return res.send(result);

            if (result.newSubscriptions.length) {
                setTimeout(function () {
                    app.set('faye').bayeux.getClient().publish('/channel-list', {
                        token:app.set('serverToken'),
                        action:'upd',
                        channels:result.newSubscriptions
                    });
                }, 100);

                for (var i = 0; i < result.newSubscriptions.length; i++) {
                    (function (i) {
                        setTimeout(function () {
                            app.set('faye').bayeux.getClient().publish('/channel/' + result.newSubscriptions[i].id + '/users', {
                                token:app.set('serverToken'),
                                action:'con',
                                users:result.userChannels[result.newSubscriptions[i].id]
                            });
                        }, 100 + (10 * i));
                    })(i);
                }
            }

            if (result.user) return res.send(app.set('helpers').user.createPrivate(result.user));

            res.send(500);
        });
    }
};