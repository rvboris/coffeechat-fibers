var sync  = require('sync');
var nconf = require('nconf');

module.exports = function (app) {
    nconf.use('file', { file: __dirname + '/../../config/' + app.set('argv').env + '.json' });

    return function (req, res) {
        sync(function () {
            var query = app.Message.find({ channelId: req.params.channel }, 'time text userId').limit(nconf.get('messages').historyPreload).sort('-time');
            var messages = query.execFind.sync(query);
            if (!messages) return;

            return messages.map(function (message) {
                var user = app.User.findById.sync(app.User, message.userId.toHexString(), 'name');
                var archive = user.name === 'deleted';

                return {
                    name: archive ? '$ Архив' : user.name,
                    time: message.time,
                    text: message.text,
                    id: message.id,
                    archive: archive
                };
            });
        }, function (err, list) {
            if (err) {
                app.set('log').error(err.stack);
                res.send(500);
                return;
            }

            if (list) {
                res.send(list);
                return;
            }

            res.send(200);
        });
    };
};
