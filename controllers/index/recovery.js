var sync           = require('sync');
var check          = require('validator').check;
var nodemailer     = require('nodemailer');
var nconf          = require('nconf');
var recaptchaAsync = require('recaptcha-async');

module.exports = function (app) {
    nconf.use('file', { file: __dirname + '/../../config/' + app.set('argv').env + '.json' });
    nodemailer.SMTP = nconf.get('smtp');

    return function (req, res) {
        sync(function () {
            var recovery = app.PasswordRecovery.findOne.sync(app.PasswordRecovery, { key: req.params.key });
            var user = recovery ? app.User.findById.sync(app.User, recovery.userId) : false;
            return user ? { user: user, recovery: recovery } : false;
        }, function (err, result) {
            if (err) {
                app.set('log').error(err.stack);
                res.send(500);
                return;
            }

            if (!result) {
                res.send(404);
                return;
            }

            var user = result.user;
            var recovery = result.recovery;
            var recaptcha = new recaptchaAsync.reCaptcha();

            recaptcha.on('data', function (result) {
                if (!result.is_valid) {
                    res.send({ error: 'Код введен не верно' });
                    return;
                }

                if (!req.body.user.password1) {
                    res.send({ error: 'Первое поле не заполнено' });
                    return;
                }

                if (!req.body.user.password2) {
                    res.send({ error: 'Второе поле не заполнено' });
                    return;
                }

                if (req.body.user.password1 !== req.body.user.password2) {
                    res.send({ error: 'Пароли не совпадают' });
                    return;
                }

                try {
                    check(req.body.user.password1).len(6, 30);
                    check(req.body.user.password2).len(6, 30);
                } catch (e) {
                    res.send({ error: 'Пароль должен быть в пределах 6-30 символов' });
                    return;
                }

                user.secret = req.body.user.password1;

                sync(function () {
                    user.save.sync(user);
                    recovery.remove.sync(recovery);

                    if (nodemailer.send_mail.sync(nodemailer, {
                        sender: 'no-reply@' + app.set('host'),
                        to: user.email,
                        subject: nconf.get('sitename') + ' // Изменение пароля',
                        html: 'Пароль для пользователя "' + user.name + '" был изменен, новый пароль: <b>' + req.body.user.password1 + '</b>'
                    })) {
                        return { msg: 'Пароль изменен' };
                    }

                    return { error: 'Ошибка отправки' };
                }, function (err, result) {
                    if (err) {
                        app.set('log').error(err.stack);
                        res.send(500);
                        return;
                    }

                    res.send(result);
                });
            });

            if (req.xhr && req.body) {
                if (!req.body.user.recaptcha_challenge_field || !req.body.user.recaptcha_response_field) {
                    res.send({ error: 'Код подверждения не заполен' });
                    return;
                }

                recaptcha.checkAnswer(nconf.get('recaptcha').privateKey, app.set('helpers').utils.getIp(req), req.body.user.recaptcha_challenge_field, req.body.user.recaptcha_response_field);
                return;
            }

            sync(function () {
                res.render(req.mobile ? 'mobile/recovery' : 'web/recovery', {
                    user: app.set('helpers').user.createPrivate(result),
                    serverKey: app.set('serverKey'),
                    session: app.session,
                    title: 'Восстановление пароля',
                    env: app.set('argv').env,
                    csrf: req.session._csrf,
                    recaptcha: recaptcha.getCaptchaHtml(nconf.get('recaptcha').publicKey, res.error)
                });
            }, function (err) {
                if (err) {
                    app.set('log').error(err.stack);
                    res.send(500);
                }
            });
        });
    }
};