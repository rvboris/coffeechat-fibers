var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        sync(function () {
            var subscriptions = app.Subscription.find.sync(app.Subscription, {
                time: { $lt: new Date(new Date().getTime() - ((app.set('faye').timeout) * 1000) * 2) }
            });

            for (var i = 0; i < subscriptions.length; i++) {
                subscriptions[i].remove.sync(subscriptions[i]);
            }

            subscriptions = app.Subscription.find.sync(app.Subscription, { channelId: req.params.channel, userId: { $nin: app.set('systemUserIds') } }, 'userId');
            if (!subscriptions) return;

            return subscriptions.map(function (subscription) {
                return app.set('helpers').user.createPublic(app.User.findById.sync(app.User, subscription.userId.toHexString(), 'name gender status'));
            });
        }, function (err, list) {
            if (err) {
                app.set('log').error(err.stack);
                res.send(500);
                return;
            }

            if (list) {
                res.send(list);
                return;
            }

            res.send(200);
        });
    };
};
