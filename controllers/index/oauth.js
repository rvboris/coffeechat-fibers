var crypto = require('crypto');
var sync   = require('sync');
var rbytes = require('rbytes');
var get    = require('get');

module.exports = function (app) {
    var successLogin = function (channels, user) {
        for (var i = 0, newSubscriptions = [], userChannels = [], result; i < channels.length; i++) {
            result = app.set('helpers').channel.subscribe.sync(app.set('helpers').channel, user, channels[i]);
            if (result.error) return result;
            if (!result.update) {
                newSubscriptions.push({
                    id: channels[i],
                    diff: 1,
                    count: app.Subscription.count.sync(app.Subscription, { channelId: channels[i], userId: { $nin: app.set('systemUserIds') } }),
                    hidden: result.channel.hidden
                });
                if (!userChannels[channels[i]]) {
                    userChannels[channels[i]] = [];
                }
                userChannels[channels[i]].push({ name: user.name, gender: user.gender, status: user.status });
            }
        }

        return {
            user: app.set('helpers').user.createPrivate.sync(app.set('helpers').user, user),
            newSubscriptions: newSubscriptions,
            userChannels: userChannels
        };
    }.async();

    return function (req, res) {
        if (!req.body.token || !req.body.channels) {
            app.set('log').debug('token or channels not found');
            return { error: 'Ошибка получения данных' };
        }

        var request = new get({ uri: 'http://ulogin.ru/token.php?token=' + req.body.token + '&host=' + app.set('host') });

        sync(function () {
            var response = request.asString.sync(request); // [data,headers]
            var userData = JSON.parse(response[0]);

            if (!userData.identity || !userData.network) {
                return { error: 'Ошибка получения данных пользователя' };
            }

            var userName = userData.first_name + ' ' + userData.last_name;
            var userIdentity = crypto.createHash('md5').update(userData.identity).digest('hex');
            var userProvider = crypto.createHash('md5').update(userData.network).digest('hex');
            var userPassword = rbytes.randomBytes(16).toHex();

            var user = app.User.findOne.sync(app.User, { name: userName /*, '_id': { $nin: app.set('systemUserIds') } */ });

            if (user) {
                var oauthUser = app.User.findOne.sync(app.User, {
                    'oauth.identity': userIdentity,
                    'oauth.provider': userProvider
                });
                if (oauthUser) {
                    req.session.user = { id: oauthUser.id };
                    return successLogin.sync(this, req.body.channels, oauthUser);
                }
                app.set('log').debug('this name is already taken');
                return { error: 'Такое имя уже занято' };
            }

            var newUser = new app.User();

            newUser.name = userName;
            newUser.secret = userPassword;
            if (userData.email) newUser.email = userData.email;
            if (userData.sex) newUser.gender = (parseInt(userData.sex) === 1) ? 'W' : 'M';
            newUser.oauth.identity = userData.identity;
            newUser.oauth.provider = userData.network;

            newUser.save.sync(newUser);
            app.set('syncServer').task('user', 'start');
            req.session.user = { id: newUser.id };
            return successLogin.sync(this, req.body.channels, newUser);
        }, function (err, result) {
            if (err) {
                if (err.name && err.name === 'ValidationError') {
                    if (err.errors.name) {
                        result.error = 'Имя должно быть от 3 до 15 знаков. Допускаются только русские и латинские буквы и цифры.';
                    }
                    if (err.errors.password) {
                        result.error = 'Пароль должен быть от 6 до 30 символов';
                    }
                    result.error = 'Недопустимые данные для входа/регистрации';
                } else {
                    app.set('log').error(err.stack);
                    res.send(500);
                    return;
                }
            }

            if (!result) {
                res.send(500);
                return;
            }

            if (result.error) {
                return res.send({ error: result.error });
            }

            res.send(result.user);

            if (result.newSubscriptions.length) {
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
        });
    }
};
