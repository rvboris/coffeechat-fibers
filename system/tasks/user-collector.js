var sync       = require('sync');
var nodemailer = require('nodemailer');
var nconf      = require('nconf');
var moment     = require('moment');

module.exports = function(app) {
    var name = 'user';

    nconf.use('file', { file: __dirname + '/../../config/' + app.set('argv').env + '.json' });
    nodemailer.SMTP = nconf.get('smtp');

    return {
        name      : name,
        interval  : 86400, // 1 day
        callback  : function(recipient, stop, interval) {
            sync(function() {
                var usersToRemove = app.User.find.sync(app.User, {
                    '_id'             : { $nin: app.set('systemUserIds') },
                    'stats.lastaccess': { $lte: new Date(new Date().getTime() - interval * 21 * 1000) }
                }, ['name', 'email']);

                app.set('log').debug(usersToRemove.length + ' innactive users to remove');

                for (var i = 0; i < usersToRemove.length; i++) {
                    var messages = app.Message.find.sync(app.Message, { userId: usersToRemove[i].id });

                    app.set('log').debug(messages.length + ' messages from "' + usersToRemove[i].name + '" to archive');

                    for (var j = 0; j < messages.length; j++) {
                        messages[j].userId = app.set('users')['deleted'].id;
                        messages[j].parsed = messages[j].text;
                        messages[j].save.sync(messages[j]);
                    }

                    if (usersToRemove[i].email) {
                        nodemailer.send_mail.sync(nodemailer, {
                            sender : 'no-reply@' + app.set('host'),
                            to     : usersToRemove[i].email,
                            subject: nconf.get('sitename') + ' // Удаление аккаунта',
                            html   : '<noindex>Ваша учетная запись удалена из-за не активности.</noindex>'
                        });
                    }

                    usersToRemove[i].remove.sync(usersToRemove[i]);
                }

                var usersToNotify = app.User.find.sync(app.User, {
                    '_id'             : { $nin: app.set('systemUserIds') },
                    'stats.lastaccess': {
                        $lt: new Date(new Date().getTime() - interval * 14 * 1000)
                    },
                    'email'           : { $exists: true }
                }, ['email']);

                app.set('log').debug(usersToNotify.length + ' innactive users to notify');

                for (i = 0; i < usersToNotify.length; i++) {
                    nodemailer.send_mail.sync(nodemailer, {
                        sender : 'no-reply@' + app.set('host'),
                        to     : usersToNotify[i].email,
                        subject: nconf.get('sitename') + ' // Напоминание',
                        html   : '<noindex>Внимание! Вы уже больше двух недель не посещали чат, через неделю (' + moment().add('week', 1).format('DD.MM.YY') + ') ваша учетная запись будет удалена, чтобы ее сохранить необходимо зайти под своим логином.</noindex>'
                    })
                }

                if (app.User.count.sync(app.User, { '_id': { $nin: app.set('systemUserIds') } }) === 0) {
                    app.set('log').debug('no users');
                    return stop();
                }
            }, function(err) {
                if (err) {
                    app.set('log').error(err.stack);
                    return stop();
                }
            });
        },
        syncObject: {
            start: function(recipient) {
                app.set('tasks')[name].start(recipient);
            }
        }
    };
};