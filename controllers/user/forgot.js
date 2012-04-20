var sync       = require('sync');
var rbytes     = require('rbytes');
var bcrypt     = require('bcrypt');
var moment     = require('moment');
var nodemailer = require('nodemailer');
var check      = require('validator').check;
var nconf      = require('nconf');

module.exports = function (app) {
    nconf.use('file', { file: __dirname + '/../../config/' + app.set('argv').env + '.json' });
    nodemailer.SMTP = nconf.get('smtp');

    return function (req, res) {
        if (!req.body.user) {
            app.set('log').debug('invalid user');
            res.send(404);
            return;
        }

        if (!req.body.user.email) {
            app.set('log').debug('email not found');
            res.send({ error: 'Вы не ввели email адрес' });
            return;
        }

        try {
            check(req.body.user.email).isEmail();
        } catch (e) {
            res.send({ error: 'Не верный email адрес' });
            return;
        }

        sync(function () {
            var user = app.User.findOne.sync(app.User, { email: req.body.user.email, '_id': { $nin: app.set('systemUserIds') } });

            if (!user) {
                return { error: 'Такой email не зарегистрирован.' };
            }

            if (app.PasswordRecovery.findOne.sync(app.PasswordRecovery, { userId: user.id })) {
                return { error: 'Сведения для восстановления пароля уже были отправлены вам на email.' };
            }

            var key = bcrypt.hashSync(rbytes.randomBytes(16).toHex(), bcrypt.genSaltSync(10));
            var link = 'http://' + app.set('host') + '/recovery/' + encodeURIComponent(key);

            if (nodemailer.send_mail.sync(nodemailer, {
                sender: 'no-reply@' + app.set('host'),
                to: req.body.user.email,
                subject: nconf.get('sitename') + ' // Восстановление пароля',
                html: '<noindex>Пользователь "' + user.name + '" запросил изменение пароля, для изменения перейдите по этой ссылке: <a href="' + link + '" rel="nofollow">' + link + '</a>.<br /><br />Ссылка действительна в течении двух часов (до ' + moment().add('hours', 2).format('DD.MM.YY HH:mm') + ').</noindex>'
            })) {
                var recovery = new app.PasswordRecovery({ userId: user.id, key: key });
                recovery.save.sync(recovery);

                app.set('syncServer').task('recovery', 'start');
                return true;
            }

            return false;
        }, function (err, result) {
            if (err) {
                app.set('log').error(err.stack);
                res.send(500);
                return;
            }

            if (result) {
                if (result.error) {
                    res.send(result);
                    return;
                } else {
                    res.send(200);
                    return;
                }
            }

            res.send(500);
        });
    };
};