var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        if (req.user.isSystem()) {
            res.send({ error: 'Системные пользователи не могут изменять статус' });
            return;
        }

        if (!req.body.status) {
            app.set('log').debug('status param not found');
            res.send(404);
            return;
        }

        sync(function () {
            req.user.status = req.body.status;
            req.user.save.sync(req.user);

            var subscriptions = app.Subscription.find.sync(app.Subscription, { userId: req.user.id }, ['channelId']);

            if (!subscriptions) {
                res.send(200);
                return;
            }

            for (var i = 0; i < subscriptions.length; i++) {
                app.set('faye').bayeux.getClient().publish('/channel/' + subscriptions[i].channelId.toHexString() + '/users', {
                    token: app.set('serverToken'),
                    action: 'update',
                    user: { name: req.user.name, status: req.user.status }
                });
            }

            res.send(200);
        }, function (err) {
            if (err) {
                if (err.name && err.name === 'ValidationError') {
                    res.send({ error: 'Недопустимые данные статуса' });
                    return;
                }
                app.set('log').error(err.stack);
                res.send(500);
            }
        });
    }
};
