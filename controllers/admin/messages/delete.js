var sync  = require('sync');
var nconf = require('nconf');

module.exports = function(app) {
    nconf.use('file', { file: __dirname + '/../../../config/' + app.set('argv').env + '.json' });

    return function(req, res) {
        if (!req.isXMLHttpRequest) return res.send(401);
        if (!req.haveAccess) return res.send(403);

        sync(function() {
            var messageToDelete = app.Message.findById.sync(app.Message, req.body.mid);
            if (!messageToDelete) return res.send({ error: 'Сообщение не найдено' });
            messageToDelete.remove.sync(messageToDelete);
            app.set('helpers').elastic.sync(app.set('helpers'), 'deleteDocument', nconf.get('elasticsearch').index, 'message', req.body.mid);
            res.send(200);
        }, function(err) {
            if (err) {
                app.set('log').error(err.stack);
                return res.send(500);
            }
        });
    }
};