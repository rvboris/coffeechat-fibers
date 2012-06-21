var sync  = require('sync');

module.exports = function (app) {
    return function (req, res) {
        sync(function () {
            var channel = app.Channel.findById.sync(app.Channel, req.params.channel);

            if (!channel) {
                res.send({ error: 'Комната не найдена' });
                return;
            }

            if (!req.body.userName) {
                res.send({ error: 'Требуется имя пользователя' });
                return;
            }

            var userToKick = app.User.findOne.sync(app.User, { name: req.body.userName });

            if (!userToKick) {
                res.send({ error: 'Пользователь не найден' });
                return;
            }

            if (channel.owner.toHexString() !== req.user.id && !req.user.isSystem() && !app.set('channels')[channel.url]) {
                res.send({ error: 'Доступ запрещен' });
            }

            if (app.Subscription.count.sync(app.Subscription, { channelId: req.params.channel }) > 0) {
                var subscription = app.Subscription.find.sync(app.Subscription, {
                    channelId: req.params.channel,
                    userId: userToKick.id
                }, ['userId']);

                app.set('faye').bayeux.getClient().publish('/user/' + userToKick.id, {
                    token: app.set('serverToken'),
                    action: 'channel.unsubscribe',
                    channel: { id: channel.id },
                    fromUser: {
                        name: req.user.name,
                        bySystem: req.user.isSystem()
                    },
                    source: 'kick'
                }).callback(function () {
                    app.set('log').debug('kick user');
                    app.set('faye').bayeux.getClient().publish('/channel/' + req.params.channel, {
                        token: app.set('serverToken'),
                        text: 'Пользователь <button class="name">' + userToKick.name + '</button> выгнан ' + (req.user.isSystem() ? 'администратором' : 'владельцем') + ' из комнаты.',
                        name: '$'
                    });
                });

                setTimeout(function () {
                    sync(function () {
                        if (app.Subscription.count.sync(app.Subscription, { channelId: req.params.channel, userId: userToKick.id }) > 0) {
                            subscription.remove.sync(subscription);
                        }
                    }, function (err) {
                        if (err) app.set('log').error(err.stack);
                    })
                }, 5000);
            }
        }, function (err) {
            if (err) {
                app.set('log').error(err.stack);
                return res.send(500);
            }

            res.send(200);
        });
    };
};