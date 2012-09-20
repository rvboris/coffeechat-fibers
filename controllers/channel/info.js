var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        sync(function () {
            var subsription = app.Subscription.count.sync(app.Subscription, {
                userId: req.user.id,
                channelId: req.params.channel
            });

            if (subsription === 0) {
                throw new Error('subscription not found');
            }

            var channel = app.Channel.findById.sync(app.Channel, req.params.channel, 'private password hidden date owner url');

            if (!channel) {
                throw new Error('channel "' + req.params.channel + '" not found');
            }

            if (channel['private']) {
                throw new Error('access denied');
            }

            var channelOwner = app.User.findById.sync(app.User, channel.owner, 'name role');

            return {
                users: app.Subscription.count.sync(app.Subscription, { channelId: channel.id, userId: { $nin: app.set('systemUserIds') } }),
                messages: app.Message.count.sync(app.Message, { channelId: channel.id }),
                date: channel.date,
                owner: channelOwner.isSystem() ? '$' : channelOwner.name,
                url: channel.url,
                hidden: channel.hidden,
                password: channel.password ? true : false
            };
        }, function (err, channelInfo) {
            if (err) {
                app.set('log').error(err.stack);
                res.send(500);
                return;
            }
            res.send(channelInfo);
        });
    };
};