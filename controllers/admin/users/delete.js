var sync   = require('sync');
var nconf  = require('nconf');

module.exports = function(app) {
    nconf.use('file', { file:__dirname + '/../../../config/' + app.set('argv').env + '.json' });

    return function(req, res) {
        if (!req.isXMLHttpRequest) return res.send(401);
        if (!req.haveAccess) return res.send(403);

        sync(function() {
            if (req.session.user.id === req.body.uid) return res.send({ error: 'Вы не можете удалить самого себя' });

            var userToDelete = app.User.findById.sync(app.User, req.body.uid);

            if (!userToDelete) {
                return res.send({ error: 'Пользователь не найден' });
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
                    query:{
                        queryString:{ query:'_id:' + queryText, analyze_wildcard:true }
                    }
                });
            } else {
                app.Message.update.sync(app.Message, { userId: userToDelete.id }, { userId: app.set('users')['deleted'].id }, null);
            }

            userToDelete.remove.sync(userToDelete);

            res.send(200);
        }, function(err) {
            if (err) {
                app.set('log').error(err.stack);
                res.send(500);
            }
        });
    }
};