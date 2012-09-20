var sync  = require('sync');
var nconf = require('nconf');

module.exports = function (app) {
    nconf.use('file', { file: __dirname + '/../../../config/' + app.set('argv').env + '.json' });

    return function (req, res) {
        if (!req.body.cid) {
            res.send({ error: 'Не указан ID комнаты' });
            return;
        }

        sync(function () {
            var channel = app.Channel.findById.sync(app.Channel, req.body.cid, '_id');

            if (!channel) {
                res.send({ error: 'Комната на найдена' });
                return;
            }

            if (app.Message.count.sync(app.Message, { channelId: channel.id }) === 0) {
                res.send(200);
                return;
            }

            app.Message.update.sync(app.Message, {
                channelId: channel.id
            }, {
                $set: { channelId: app.set('channels')['deleted'].id }
            }, {
                upsert: false,
                multi: true
            });

            app.set('helpers').elastic.sync(app.set('helpers'), 'deleteByQuery', nconf.get('elasticsearch').index, 'message', {
                term: { channelId: channel.id }
            });

            res.send(200);
        }, function (err) {
            if (err) {
                app.set('log').error(err.stack);
                res.send(500);
            }
        });
    };
};