var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        if (!req.isXMLHttpRequest) return res.send(401);

        sync(function () {
            var channels = app.Channel.find.sync(app.Channel, { private:false });
            if (!channels) throw new Error('channels not found');

            for (var i = 0, channelList = []; i < channels.length; i++) {
                channelList.push({ id:channels[i].id, name:channels[i].name, url:channels[i].url, count:app.Subscription.count.sync(app.Subscription, { channelId:channels[i].id }) });
            }

            return channelList;
        }, function (err, channelList) {
            if (err) {
                app.set('log').error(err.stack);
                return res.send(500);
            }
            res.send(channelList);
        });
    }
};