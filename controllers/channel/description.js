var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        sync(function () {
            var channel = app.Channel.findById.sync(app.Channel, req.params.channel, 'private description');

            if (!channel) {
                throw new Error('channel "' + req.params.channel + '" not found');
            }

            if (channel['private']) {
                throw new Error('access denied');
            }

            channel.description ? res.send(channel.description) : res.send('');
        }, function (err) {
            if (err) {
                app.set('log').error(err.stack);
                res.send(500);
            }
        });
    };
};