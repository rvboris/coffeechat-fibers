var sync  = require('sync');
var nconf = require('nconf');

module.exports = function (app) {
    nconf.use('file', { file: __dirname + '/../../../config/' + app.set('argv').env + '.json' });

    return function (req, res) {
        if (!req.body.mid) {
            res.send({ error: 'Не указан ID сообщения' });
            return;
        }

        sync(function () {
            var messageToDelete = app.Message.findById.sync(app.Message, req.body.mid);

            if (!messageToDelete) {
                res.send({ error: 'Сообщение не найдено' });
                return;
            }

            messageToDelete.remove.sync(messageToDelete);
            app.set('helpers').elastic.sync(app.set('helpers'), 'deleteDocument', nconf.get('elasticsearch').index, 'message', req.body.mid);

            res.send(200);
        }, function (err) {
            if (!err) return;

            app.set('log').error(err.stack);
            res.send(500);
        });
    };
};