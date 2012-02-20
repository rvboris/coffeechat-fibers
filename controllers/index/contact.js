var Validator  = require('validator').Validator;
var nodemailer = require('nodemailer');
var nconf      = require('nconf');
var sync       = require('sync');

module.exports = function(app) {
    var vdr = new Validator();
    nconf.use('file', { file: __dirname + '/../../config/' + app.set('argv').env + '.json' });
    nodemailer.SMTP = nconf.get('smtp');

    return function(req, res) {
        if (req.body.contact) {
            if (!req.body.contact.name || !req.body.contact.email || !req.body.contact.message) {
                return res.send({ error: 'Все поля обязательны для заполнения' });
            }

            try {
                vdr.check(req.body.contact.name).regex(/^[А-Яа-яЁёA-Za-z0-9\s]+$/);
            } catch (e) {
                return res.send({ error: 'Имя содержит недопустимые символы' });
            }

            try {
                vdr.check(req.body.contact.email).isEmail();
            } catch (e) {
                return res.send({ error: 'Введите корректный email адрес' });
            }

            try {
                vdr.check(req.body.contact.message).regex(/^[А-Яа-яЁёA-Za-z0-9\s]+$/);
            } catch (e) {
                return res.send({ error: 'Текст сообщения содержит недопустимые символы' });
            }

            sync(function() {
                return nodemailer.send_mail.sync(nodemailer, {
                    sender : req.body.contact.email,
                    to     : 'rv.boris@gmail.com',
                    subject: 'Новое сообщение от ' + req.body.contact.name + ' (' + req.body.contact.email + ') // ' + nconf.get('sitename'),
                    html   : req.body.contact.message
                });
            }, function(err, result) {
                if (err) {
                    app.set('log').error(err.stack);
                    return res.send(500);
                }

                if (result) {
                    return res.send({ result: 'Сообщение успешно отправлено' });
                }

                return res.send({ error: 'Ошибка при отправке сообщения' });
            });
        } else {
            try {
                res.render((req.mobile ? 'mobile' : 'web') + '/contact', {
                    title: 'Контакты',
                    env  : app.set('argv').env
                });
            } catch (e) {
                app.set('log').error(e.stack);
                res.send(500);
            }
        }
    };
};