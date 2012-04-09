var http = require('http');
var aes  = require('../helpers/aes.js');
var sync = require('sync');
var io   = require('socket.io');

module.exports = function (app) {
    var server = http.createServer(function (req, res) {
        res.statusCode = 403;
        res.end();
    });

    io = io.listen(server);

    io.configure(function () {
        io.enable('browser client minification');
        io.enable('browser client etag');
        io.enable('browser client gzip');
        io.set('log level', 1);
    });

    io.of('/logs')
        .on('connection', function (socket) {
            socket.on('authentication', function (key, callback) {
                key = app.set('helpers').utils.base64.decode(key);

                try {
                    var userId = aes.dec(key, app.set('serverKey'));
                } catch (e) {
                    return callback('key encoding failed');
                }

                sync(function () {
                    return app.User.findById.sync(app.User, userId, ['role']);
                }, function (err, user) {
                    if (err) return callback('failed');
                    if (user && user.role === 'R') {
                        return socket.set('authorized', userId, function () {
                            callback('ok');
                        });
                    }
                    callback('access denied');
                });
            });
        });

    server.listen(app.set('argv').logserver);

    return {
        log:function (msg) {
            var clients = io.of('/logs').clients();
            sync(function () {
                for (var i = 0; i < clients.length; i++) {
                    var userId = clients[i].get.sync(clients[i], 'authorized');
                    if (!userId) return;
                    var user = app.User.findById.sync(app.User, userId, ['role']);
                    if (!user) return;
                    if (user.role !== 'R') return;
                    clients[i].emit('log', msg);
                }
            });
        }
    };
};