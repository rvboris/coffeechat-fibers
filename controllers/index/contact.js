var Validator      = require('validator').Validator;
var nodemailer     = require('nodemailer');
var nconf          = require('nconf');
var sync           = require('sync');
var recaptchaAsync = require('recaptcha-async');

module.exports = function (app) {
    var vdr = new Validator();
    nconf.use('file', { file: __dirname + '/../../config/' + app.set('argv').env + '.json' });
    nodemailer.SMTP = nconf.get('smtp');

    return function (req, res) {
        var recaptcha = new recaptchaAsync.reCaptcha();

        if (req.xhr) {
            recaptcha.on('data', function (result) {
                if (result.is_valid) {
                    if (!req.body.contact.name || !req.body.contact.email || !req.body.contact.message) {
                        res.send({ error: 'Все поля обязательны для заполнения' });
                        return;
                    }

                    try {
                        vdr.check(req.body.contact.name).regex(/^[А-Яа-яЁёA-Za-z0-9\s]+$/);
                    } catch (e) {
                        res.send({ error: 'Имя содержит недопустимые символы' });
                        return;
                    }

                    try {
                        vdr.check(req.body.contact.email).isEmail();
                    } catch (e) {
                        res.send({ error: 'Введите корректный email адрес' });
                        return;
                    }

                    try {
                        vdr.check(req.body.contact.message).regex(/^[А-Яа-яЁёA-Za-z0-9\s]+$/);
                    } catch (e) {
                        res.send({ error: 'Текст сообщения содержит недопустимые символы' });
                        return;
                    }

                    sync(function () {
                        return nodemailer.send_mail.sync(nodemailer, {
                            sender: req.body.contact.email,
                            to: 'rv.boris@gmail.com',
                            subject: 'Новое сообщение от ' + req.body.contact.name + ' (' + req.body.contact.email + ') // ' + nconf.get('sitename'),
                            html: req.body.contact.message
                        });
                    }, function (err, result) {
                        if (err) {
                            app.set('log').error(err.stack);
                            res.send(500);
                            return;
                        }

                        if (result) {
                            res.send({ result: 'Сообщение успешно отправлено' });
                            return;
                        }

                        res.send({ error: 'Ошибка при отправке сообщения' });
                    });
                } else {
                    res.send({ error: 'Код введен не верно' });
                }
            });

            if (!req.body.contact.recaptcha_challenge_field || !req.body.contact.recaptcha_response_field) {
                res.send({ error: 'Код подверждения не заполен' });
                return;
            }

            recaptcha.checkAnswer(nconf.get('recaptcha').privateKey, app.set('helpers').utils.getIp(req), req.body.contact.recaptcha_challenge_field, req.body.contact.recaptcha_response_field);
        } else {
            try {
                res.render((req.mobile ? 'mobile' : 'web') + '/contact', {
                    csrf: req.session._csrf,
                    title: 'Контакты',
                    env: app.set('argv').env,
                    recaptcha: recaptcha.getCaptchaHtml(nconf.get('recaptcha').publicKey, res.error)
                });
            } catch (e) {
                app.set('log').error(e.stack);
                res.send(500);
            }
        }
    };
};