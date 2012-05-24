var sync = require('sync');

module.exports = function (app) {
    var removeChannel = function(channel) {
        channel.remove.sync(channel);
    }.async();

    return function (req, res) {
        sync(function () {
            var channel = app.Channel.findById.sync(app.Channel, req.params.channel );

            if (!channel) {
                res.send({ error: 'Комната не найдена' });
                return;
            }

            if (channel.owner !== req.user.id) {
                res.send({ error: 'Доступ запрещен' });
            }

            if (app.Subscription.count.sync(app.Subscription, { channelId: req.params.channel }) > 0) {
                var users = app.Subscription.find.sync(app.Subscription, { channelId: req.params.channel }, [ '_id' ]);

                (function publish (iteration) {
                    iteration = iteration || 0;
                    app.set('faye').bayeux.getClient().publish('/user/' + users[iteration].id, {
                        token: app.set('serverToken'),
                        action: 'channel.unsubscribe',
                        channel: channel.id
                    }).callback(function () {
                        app.set('log').debug('user force to unsubscribe');
                        iteration++;
                        if (iteration < users.length) {
                            publish(iteration);
                        } else {
                            removeChannel(channel);
                        }
                    });
                })();
            } else {
                removeChannel(channel);
            }
        }, function (err) {
            if (err) {
                app.set('log').error(err.stack);
                res.send(500);
            }
        });
    };
};