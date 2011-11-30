var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        if (!req.isXMLHttpRequest || req.session.user.id == '0') return res.send(401);

        sync(function () {
            var user = app.User.findById.sync(app.User, req.session.user.id);
            if (!user) return { error: 'Пользователь не найден' };

            var pubTrigger = false;

            if (req.body.user.gender) {
                if (req.body.user.gender.male) {
                    user.gender = 'M';
                    pubTrigger = true;
                } else if (req.body.user.gender.female) {
                    user.gender = 'W';
                    pubTrigger = true;
                }
            } else {
                user.gender = 'N';
                pubTrigger = true;
            }

            if (req.body.user.email && req.body.user.email != '') {
                user.email = req.body.user.email;
            }

            if (req.body.user.password && req.body.user.password != '') {
                if (req.body.user.password.length < 6 || req.body.user.password.length > 30) {
                    return { error: 'Недопустимый размер пароля' };
                }
                user.secret = req.body.user.password;
            }

            user.save.sync(user);
            app.set('log').debug('the user is saved');

            if (!pubTrigger) return;

            var subscriptions = app.Subscription.find.sync(app.Subscription, { userId: req.session.user.id });

            for (var i = 0; i < subscriptions.length; i++) {
                app.set('faye').bayeux.getClient().publish('/channel/' + subscriptions[i].channelId.toHexString() + '/users', {
                    token: app.set('serverToken'),
                    action: 'update',
                    user: { name: user.name, gender: user.gender }
                });
            }
        }, function (err, result) {
            if (err) {
                if (err.name && err.name == 'ValidationError') {
                    if (err.errors.name) {
                        return res.send({ error: 'Имя не должно содержать специальные символы' });
                    }
                    if (err.errors.password) {
                        return res.send({ error: 'Пароль должен быть от 6 до 30 символов' });
                    }
                    if (err.errors.email) {
                        return res.send({ error: 'Не верный email адрес' });
                    }
                    return res.send({ error: 'Недопустимые данные аккаунта' });
                }
                app.set('log').error(err.stack);
                return res.send(500);
            }
            if (result && result.error) return res.send(result);
            res.send(200);
        });
    }
};