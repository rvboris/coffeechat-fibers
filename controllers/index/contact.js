var Validator  = require('validator').Validator;
var nodemailer = require('nodemailer');

module.exports = function (app) {
    var vdr = new Validator();

    return function (req, res) {
        if (req.body.contact) {
            if (!req.body.contact.name || !req.body.contact.email || !req.body.contact.text) {
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
                vdr.check(req.body.contact.text).regex(/^[А-Яа-яЁёA-Za-z0-9\s]+$/);
            } catch (e) {
                return res.send({ error: 'Текст сообщения содержит недопустимые символы' });
            }

            if (nodemailer.send_mail.sync(nodemailer, {
                sender: req.body.contact.email,
                to: 'rv.boris@gmail.com',
                subject: 'Новое сообщение от ' + req.body.contact.name + ' // ' + app.set('config').get('sitename'),
                html: req.body.contact.text
            })) {
                return res.send({ result: 'Сообщение успешно отправлено' });
            }

            return res.send({ error: 'Ошибка при отправке сообщения' });
        } else {
            try {
                res.render((req.mobile ? 'mobile' : 'web') + '/contact', {
                    title: 'Контакты',
                    env: app.set('argv').env
                });
            } catch (e) {
                app.set('log').error(err.stack);
                res.send(500);
            }
        }
    };
};