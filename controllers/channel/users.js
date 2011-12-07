var sync = require('sync');

module.exports = function(app) {
    return function(req, res) {
        if (!req.isXMLHttpRequest) return res.send(401);

        if (!req.params.channel) {
            app.set('log').debug('channel param not found');
            return res.send(404);
        }

        sync(function() {
            var subscriptions = app.Subscription.find.sync(app.Subscription, {
                time: { $lt: new Date(new Date().getTime() - ((app.set('faye').timeout) * 1000) * 2) }
            });

            for (var i = 0; i < subscriptions.length; i++) subscriptions[i].remove.sync(subscriptions[i]);

            subscriptions = app.Subscription.find.sync(app.Subscription, { channelId: req.params.channel });
            if (!subscriptions) return;

            var userList = [];
            for (i = 0; i < subscriptions.length; i++) {
                userList.push(app.set('helpers').user.createPublic(app.User.findById.sync(app.User, subscriptions[i].userId.toHexString())));
            }

            return userList;
        }, function(err, userList) {
            if (err) {
                app.set('log').error(err.stack);
                return res.send(500);
            }
            if (userList) return res.send(userList);
            res.send(200);
        });
    }
};
