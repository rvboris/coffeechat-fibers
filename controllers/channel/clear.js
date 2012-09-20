var sync  = require('sync');
var nconf = require('nconf');

module.exports = function (app) {
    nconf.use('file', { file: __dirname + '/../../config/' + app.set('argv').env + '.json' });

    return function (req, res) {
        sync(function () {
            var channel = app.Channel.findById.sync(app.Channel, req.params.channel);

            if (!channel) {
                res.send({ error: 'Комната не найдена' });
                return;
            }

            if (channel.owner.toHexString() !== req.user.id && !req.user.isSystem() && !app.set('channels')[channel.url]) {
                res.send({ error: 'Доступ запрещен' });
            }

            if (app.Message.count.sync(app.Message, { channelId: channel.id }) > 0 && !channel.hidden && !channel.password) {
                app.set('log').debug('remove messages from ES index');
                app.set('helpers').elastic.sync(app.set('helpers'), 'deleteByQuery', nconf.get('elasticsearch').index, 'message', {
                    term: { channelId: channel.id }
                });
                app.set('log').debug('delete messages from channel');
                app.Message.remove.sync(app.Message, { channelId: channel.id });
            }

            if (app.Subscription.count.sync(app.Subscription, { channelId: req.params.channel }) > 0) {
                var subscriptions = app.Subscription.find.sync(app.Subscription, { channelId: req.params.channel }, 'userId');

                (function publish (iteration) {
                    iteration = iteration || 0;
                    app.set('faye').bayeux.getClient().publish('/user/' + subscriptions[iteration].userId.toHexString(), {
                        token: app.set('serverToken'),
                        action: 'channel.clear',
                        channel: { id: channel.id },
                        fromUser: { name: req.user.name, bySystem: req.user.isSystem() }
                    }).callback(function () {
                        app.set('log').debug('user notify to clear history');
                        iteration++;
                        if (iteration < subscriptions.length) {
                            publish(iteration);
                        }
                    });
                })();
            }
        }, function (err) {
            if (err) {
                app.set('log').error(err.stack);
                return res.send(500);
            }

            res.send(200);
        });
    };
};