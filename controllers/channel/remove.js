var sync = require('sync');

module.exports = function (app) {
    var removeChannel = function (channel, res) {
        channel.remove.sync(channel);

        if (!channel.hidden) {
            app.set('faye').bayeux.getClient().publish('/channel-list', {
                token: app.set('serverToken'),
                action: 'rem',
                channel: { id: channel.id },
                count: app.Channel.count.sync(app.Channel, { hidden: false, private: false })
            });
        }

        app.set('log').debug('user remove channel');
        res.send(200);
    }.async();

    return function (req, res) {
        sync(function () {
            var channel = app.Channel.findById.sync(app.Channel, req.params.channel);

            if (!channel) {
                res.send({ error: 'Комната не найдена' });
                return;
            }

            if (channel.owner.toHexString() !== req.user.id) {
                res.send({ error: 'Доступ запрещен' });
            }

            if (app.Subscription.count.sync(app.Subscription, { channelId: req.params.channel }) > 0) {
                var subscriptions = app.Subscription.find.sync(app.Subscription, { channelId: req.params.channel }, ['userId']);

                (function publish (iteration) {
                    iteration = iteration || 0;
                    app.set('faye').bayeux.getClient().publish('/user/' + subscriptions[iteration].userId.toHexString(), {
                        token: app.set('serverToken'),
                        action: 'channel.unsubscribe',
                        channel: { id: channel.id },
                        fromUser: { name: req.user.name }
                    }).callback(function () {
                        app.set('log').debug('user force to unsubscribe');
                        iteration++;
                        if (iteration < subscriptions.length) {
                            publish(iteration);
                        } else {
                            removeChannel.sync(this, channel, res);
                        }
                    });
                })();
            } else {
                removeChannel.sync(this, channel, res);
            }
        }, function (err) {
            if (err) {
                app.set('log').error(err.stack);
                res.send(500);
            }
        });
    };
};