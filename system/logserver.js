var http = require('http');
var aes  = require('../helpers/aes.js');
var sync = require('sync');
var io   = require('socket.io');

module.exports = function (app) {
    var server = http.createServer(function (req, res) {
        res.statusCode = 403;
        res.end();
    });

    io = io.listen(server, { log: false });

    io.of('/logs')
        .on('connection', function (socket) {
            socket.on('authentication', function (key, callback) {
                key = app.set('helpers').utils.base64.decode(key);

                try {
                    var userId = aes.dec(key, app.set('serverKey'));
                } catch (e) {
                    callback('key encoding failed');
                    return;
                }

                sync(function () {
                    return app.User.findById.sync(app.User, userId, 'role');
                }, function (err, user) {
                    if (err) {
                        callback('failed');
                        return;
                    }
                    if (user.isSystem() && user.role === 'R') {
                        socket.set('authorized', userId, function () {
                            callback('ok');
                        });
                        return;
                    }
                    callback('access denied');
                });
            });
        });

    server.listen(app.set('argv').logserver);

    function sendToAuthorized (event, msg) {
        var clients = io.of('/logs').clients();
        sync(function () {
            for (var i = 0; i < clients.length; i++) {
                var userId = clients[i].get.sync(clients[i], 'authorized');
                if (!userId) return;
                var user = app.User.findById.sync(app.User, userId, 'role');
                if (!user) return;
                if (!user.isSystem() || user.role !== 'R') return;
                clients[i].emit(event, msg);
            }
        }, function(err) {
            if (!err) return;
            app.set('log').error(err.stack);
        });
    }

    return {
        log: function (msg) {
            sendToAuthorized('log', msg);
        },
        event: function (event) {
            sendToAuthorized(event, null);
        }
    };
};