var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        sync(function () {
            var pubTrigger = false;

            if (req.user.isSystem()) {
                return { error: 'Системные пользователи не могут изменять аккаунт' }
            }

            if (req.body.user.gender) {
                if (req.body.user.gender.male) {
                    req.user.gender = 'M';
                    pubTrigger = true;
                } else if (req.body.user.gender.female) {
                    req.user.gender = 'W';
                    pubTrigger = true;
                }
            } else {
                req.user.gender = 'N';
                pubTrigger = true;
            }

            if (req.body.user.email && req.body.user.email !== '') {
                req.user.email = req.body.user.email;
            }

            if (req.body.user.password && req.body.user.password !== '') {
                if (req.body.user.password.length < 6 || req.body.user.password.length > 30) {
                    return { error: 'Недопустимый размер пароля' };
                }
                req.user.secret = req.body.user.password;
            }

            req.user.save.sync(req.user);
            app.set('log').debug('the user is saved');

            if (!pubTrigger) return;

            var subscriptions = app.Subscription.find.sync(app.Subscription, { userId: req.user.id }, 'channelId');

            for (var i = 0; i < subscriptions.length; i++) {
                app.set('faye').bayeux.getClient().publish('/channel/' + subscriptions[i].channelId.toHexString() + '/users', {
                    token: app.set('serverToken'),
                    action: 'update',
                    user: { name: req.user.name, gender: req.user.gender }
                });
            }
        }, function (err, result) {
            if (err) {
                if (err.name && err.name === 'ValidationError') {
                    if (err.errors.name) {
                        res.send({ error: 'Имя не должно содержать специальные символы' });
                        return;
                    }
                    if (err.errors.password) {
                        res.send({ error: 'Пароль должен быть от 6 до 30 символов' });
                        return;
                    }
                    if (err.errors.email) {
                        res.send({ error: 'Не верный email адрес' });
                        return;
                    }
                    res.send({ error: 'Недопустимые данные аккаунта' });
                    return;
                }
                app.set('log').error(err.stack);
                res.send(500);
                return
            }
            if (result && result.error) return res.send(result);
            res.send(200);
        });
    };
};