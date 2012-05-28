var sync  = require('sync');
var nconf = require('nconf');

module.exports = function (app) {
    var name = 'channel';

    nconf.use('file', { file: __dirname + '/../../config/' + app.set('argv').env + '.json' });

    return {
        name: name,
        interval: 86400, // 24 hours
        callback: function (recipient, stop, interval) {
            app.set('log').debug('find inactive channels');

            sync(function () {
                if (app.Channel.count.sync(app.Channel, { private: false }) === 0) return stop();

                var channels = app.Channel.find.sync(app.Channel, {
                    time: { $lt: new Date(new Date().getTime() - (interval) * 1000) }
                });

                if (!channels || channels.length === 0) return;

                app.set('log').debug('%s results found inactive channels', channels.length);

                // Remove messages from ES index and channels

                for (var i = 0, commands = []; i < channels.length; i++) {
                    if (app.Message.count.sync(app.Message, { channelId: channel.id }) > 0) {
                        app.set('log').debug('remove messages from ES index');
                        app.set('helpers').elastic.sync(app.set('helpers'), 'deleteByQuery', nconf.get('elasticsearch').index, 'message', {
                            term: { channelId: channels[i].id }
                        });

                        app.set('log').debug('move messages to "deleted" channel');
                        app.Message.update.sync(app.Message, { channelId: channels[i].id }, { channelId: app.set('channels')['deleted'].id }, null);
                    }

                    app.set('log').debug('remove channel "%"', channels[i].name);
                    commands.push({
                        channel: '/channel-list',
                        data: {
                            action: 'rem',
                            channel: { id: channels[i].id }
                        }
                    });
                    channels[i].remove.sync(channels[i]);
                }

                recipient.publishBulk(commands);

                app.set('log').debug('%s channels in list updated', channels.length);
            }, function (err) {
                if (!err) return;

                app.set('log').error(err.stack);
                stop();
            });
        },
        syncObject: {
            start: function (recipient) {
                app.set('tasks')[name].start(recipient);
            }
        }
    };
};