module.exports = function(argv) {
    var server = require('http').createServer(function(req, res) {
        res.statusCode = 403;
        res.end();
    });

    var io = require('socket.io').listen(server);

    server.listen(argv.logserver);

    io.configure(function() {
        io.enable('browser client minification');
        io.enable('browser client etag');
        io.enable('browser client gzip');
        io.set('log level', 1);
    });

    var socketIO;

    io.sockets.on('connection', function(socket) {
        socketIO = socket;
    });

    return {
        log: function(msg) {
            if (!socketIO) return;
            socketIO.emit('log', msg);
        }
    };
};