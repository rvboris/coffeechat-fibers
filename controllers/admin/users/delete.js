var sync  = require('sync');
var nconf = require('nconf');

module.exports = function (app) {
    nconf.use('file', { file: __dirname + '/../../../config/' + app.set('argv').env + '.json' });

    return function (req, res) {
        if (!req.body.uid) {
            res.send({ error: 'Не указан ID пользователя' });
            return;
        }

        sync(function () {
            if (req.user.id === req.body.uid) {
                res.send({ error: 'Вы не можете удалить самого себя' });
                return;
            }

            var userToDelete = app.User.findById.sync(app.User, req.body.uid);

            if (!userToDelete) {
                res.send({ error: 'Пользователь не найден' });
                return;
            }

            app.Subscription.remove.sync(app.Subscription, { userId: userToDelete.id });
            app.PasswordRecovery.remove.sync(app.PasswordRecovery, { userId: userToDelete.id });

            var userChannels = app.Channel.find.sync(app.Channel, { owner: userToDelete.id });

            if (userChannels) {
                for (var i = 0; i < userChannels.length; i++) {
                    app.Subscription.remove.sync(app.Subscription, { channelId: userChannels[i].id });
                }
            }

            if (req.body.withMessages === 'true') {
                app.Message.remove.sync(app.Message, { userId: userToDelete.id });
                app.set('helpers').elastic.sync(app.set('helpers'), 'deleteByQuery', nconf.get('elasticsearch').index, 'message', {
                    term: { userId: userToDelete.id }
                });
            } else {
                app.Message.update.sync(app.Message, { userId: userToDelete.id }, { userId: app.set('users')['deleted'].id }, false, true);
                // TODO: Update ES index (bulk?)
            }

            userToDelete.remove.sync(userToDelete);

            res.send(200);
        }, function (err) {
            if (!err) return;

            app.set('log').error(err.stack);
            res.send(500);
        });
    };
};