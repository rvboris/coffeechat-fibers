var sync       = require('sync');
var rbytes     = require('rbytes');
var bcrypt     = require('bcrypt');
var moment     = require('moment');
var nodemailer = require('nodemailer');
var check      = require('validator').check;
var nconf      = require('nconf');

module.exports = function(app) {
    nconf.use('file', { file: __dirname + '/../../config/' + app.set('argv').env + '.json' });
    nodemailer.SMTP = nconf.get('smtp');

    return function(req, res) {
        if (!req.isXMLHttpRequest) return res.send(401);

        if (!req.body.user) {
            app.set('log').debug('invalid user');
            return res.send(404);
        }

        if (!req.body.user.email) {
            app.set('log').debug('email not found');
            return res.send({ error: 'Вы не ввели email адрес' });
        }

        try {
            check(req.body.user.email).isEmail();
        } catch (e) {
            return res.send({ error: 'Не верный email адрес' });
        }

        sync(function() {
            var user = app.User.findOne.sync(app.User, { email: req.body.user.email, '_id': { $nin: app.set('systemUserIds') } });

            if (!user) {
                return { error: 'Такой email не зарегистрирован.' };
            }

            if (app.PasswordRecovery.findOne.sync(app.PasswordRecovery, { userId: user.id })) {
                return { error: 'Сведения для восстановления пароля уже были отправлены вам на email.' };
            }

            var key = bcrypt.encrypt_sync(rbytes.randomBytes(16).toHex(), bcrypt.gen_salt_sync(10));
            var link = 'http://' + app.set('host') + '/recovery/' + encodeURIComponent(key);

            if (nodemailer.send_mail.sync(nodemailer, {
                sender : 'no-reply@' + app.set('host'),
                to     : req.body.user.email,
                subject: nconf.get('sitename') + ' // Восстановление пароля',
                html   : '<noindex>Для изменения пароля перейдите по этой ссылке: <a href="' + link + '" rel="nofollow">' + link + '</a>.<br /><br />Ссылка действительна в течении двух часов (до ' + moment().add('hours', 2).format('DD.MM.YY HH:mm') + ').</noindex>'
            })) {
                var recovery = new app.PasswordRecovery({ userId: user.id, key: key });
                recovery.save.sync(recovery);

                app.set('syncServer').task('recovery', 'start');
                return true;
            }

            return false;
        }, function(err, result) {
            if (err) {
                app.set('log').error(err.stack);
                return res.send(500);
            }

            if (result) {
                if (result.error) {
                    return res.send(result);
                } else {
                    return res.send(200);
                }
            }

            res.send(500);
        });
    }
};