var sync  = require('sync');
var nconf = require('nconf');

module.exports = function (app) {
    nconf.use('file', { file: __dirname + '/../../config/' + app.set('argv').env + '.json' });

    var removeChannel = function (channel, res) {
        if (app.Message.count.sync(app.Message, { channelId: channel.id }) > 0 && !channel.hidden && !channel.password) {
            app.set('log').debug('remove messages from ES index');
            app.set('helpers').elastic.sync(app.set('helpers'), 'deleteByQuery', nconf.get('elasticsearch').index, 'message', {
                term: { channelId: channel.id }
            });
            app.set('log').debug('move messages to "deleted" channel');
            app.Message.update.sync(app.Message, {
                channelId: channel.id
            }, {
                $set: { channelId: app.set('channels')['deleted'].id }
            }, {
                upsert: false,
                multi: true
            });
        }

        channel.remove.sync(channel);

        if (!channel.hidden) {
            app.set('faye').bayeux.getClient().publish('/channel-list', {
                token: app.set('serverToken'),
                action: 'rem',
                channel: { id: channel.id },
                count: app.Channel.count.sync(app.Channel, { 'hidden': false, 'private': false })
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

            if (channel.owner.toHexString() !== req.user.id && !req.user.isSystem() && !app.set('channels')[channel.url]) {
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
                        fromUser: {
                            name: req.user.name,
                            bySystem: req.user.isSystem()
                        },
                        source: 'delete'
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