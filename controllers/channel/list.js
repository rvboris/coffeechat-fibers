var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        if (!req.isXMLHttpRequest) {
            res.send(401);
            return;
        }

        sync(function () {
            var channels = app.Channel.find.sync(app.Channel, { 'private': false }, ['name', 'url']);

            if (!channels) {
                throw new Error('channels not found');
            }

            return channels.map(function (channel) {
                return {
                    id: channel.id,
                    name: channel.name,
                    url: channel.url,
                    count: app.Subscription.count.sync(app.Subscription, {
                        channelId: channel.id,
                        userId: { $nin: app.set('systemUserIds') }
                    })
                };
            });
        }, function (err, list) {
            if (err) {
                app.set('log').error(err.stack);
                res.send(500);
                return;
            }
            res.send(list);
        });
    };
};