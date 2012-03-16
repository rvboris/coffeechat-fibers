var sync = require('sync');

module.exports = function(app) {
    return function(req, res) {
        if (!req.isXMLHttpRequest || req.session.user.id === '0') return res.send(401);

        if (!req.body.status) {
            app.set('log').debug('status param not found');
            return res.send(404);
        }

        sync(function() {
            var user = app.User.findById.sync(app.User, req.session.user.id);
            if (!user) {
                app.set('log').debug('user not found');
                return res.send(404);
            }

            user.status = req.body.status;
            user.save.sync(user);

            var subscriptions = app.Subscription.find.sync(app.Subscription, { userId: user.id }, ['channelId']);
            if (!subscriptions) return res.send(200);

            for (var i = 0; i < subscriptions.length; i++) {
                app.set('faye').bayeux.getClient().publish('/channel/' + subscriptions[i].channelId.toHexString() + '/users', {
                    token: app.set('serverToken'),
                    action: 'update',
                    user: { name: user.name, status: user.status }
                });
            }

            res.send(200);
        }, function(err) {
            if (err) {
                if (err.name && err.name === 'ValidationError') {
                    return res.send({ error: 'Недопустимые данные статуса' });
                }
                app.set('log').error(err.stack);
                return res.send(500);
            }
        });
    }
};
