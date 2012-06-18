var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        sync(function () {
            var channel = app.Channel.findById.sync(app.Channel, req.params.channel, ['private', 'description', 'salt']);

            if (!channel) {
                throw new Error('channel "' + req.params.channel + '" not found');
            }

            return channel;
        }, function (err, channel) {
            if (err) {
                app.set('log').error(err.stack);
                res.send(500);
                return;
            }

            res.send({
                description: channel.description || '',
                secure: channel.salt ? true : false
            });
        });
    };
};