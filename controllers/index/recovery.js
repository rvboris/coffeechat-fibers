var sync       = require('sync');
var check      = require('validator').check;
var nodemailer = require('nodemailer');
var nconf      = require('nconf');

module.exports = function(app) {
    nconf.use('file', { file: __dirname + '/../../config/' + app.set('argv').env + '.json' });
    nodemailer.SMTP = nconf.get('smtp');

    return function(req, res) {
        if (!req.params.key) {
            app.set('log').debug('recovery key not found');
            return res.send(404);
        }

        sync(function() {
            var recovery = app.PasswordRecovery.findOne.sync(app.PasswordRecovery, { key: req.params.key });
            var user = recovery ? app.User.findById.sync(app.User, recovery.userId) : false;

            if (!user) return false;

            if (req.isXMLHttpRequest && req.body) {
                if (!req.body.user.password1)
                    return { error: 'Первое поле не заполнено' };
                if (!req.body.user.password2)
                    return { error: 'Второе поле не заполнено' };
                if (req.body.user.password1 != req.body.user.password2)
                    return { error: 'Пароли не совпадают' };

                try {
                    check(req.body.user.password1).len(6, 30);
                    check(req.body.user.password2).len(6, 30);
                } catch (e) {
                    return { error: 'Пароль должен быть в пределах 6-30 символов' };
                }

                user.secret = req.body.user.password1;

                user.save.sync(user);
                recovery.remove.sync(recovery);

                if (nodemailer.send_mail.sync(nodemailer, {
                    sender : 'no-reply@' + app.set('host'),
                    to     : user.email,
                    subject: nconf.get('sitename') + ' // Изменение пароля',
                    html   : 'Пароль был изменен, ваш новый пароль: <b>' + req.body.user.password1 + '</b>'
                })) {
                    return { msg: 'Пароль изменен' };
                }
            }

            return user;
        }, function(err, result) {
            if (err) {
                app.set('log').error(err.stack);
                return res.send(500);
            }

            if (result instanceof app.User) {
                try {
                    return res.render(req.mobile ? 'mobile/recovery' : 'web/recovery', {
                        user     : app.set('helpers').user.createPrivate(result),
                        serverKey: app.set('serverKey'),
                        session  : app.session,
                        title    : 'Восстановление пароля',
                        env      : app.set('argv').env
                    });
                } catch (e) {
                    app.set('log').error(e.stack);
                }
            }

            if (result.error) return res.send(result);
            if (result.msg) return res.send(result.msg);

            res.send(404);
        });
    }
};