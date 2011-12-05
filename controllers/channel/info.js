var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        if (!req.isXMLHttpRequest || req.session.user.id === '0') return res.send(401);

        if (!req.params.channel) {
            app.set('log').debug('channel param not found');
            return res.send(404);
        }

        sync(function () {
            var subsription = app.Subscription.findOne.sync(app.Subscription, {
                userId:req.session.user.id,
                channelId:req.params.channel
            });

            if (!subsription) throw new Error('subscription not found');

            var channel = app.Channel.findById.sync(app.Channel, req.params.channel);
            if (!channel) throw new Error('channel "' + req.params.channel + '" not found');

            return {
                users:app.Subscription.count.sync(app.Subscription, { channelId:req.params.channel }),
                messages:app.Message.count.sync(app.Message, { channelId:req.params.channel }),
                date:channel.date
            };
        }, function (err, channelInfo) {
            if (err) {
                app.set('log').error(err.stack);
                return res.send(500);
            }
            res.send(channelInfo);
        });
    }
};