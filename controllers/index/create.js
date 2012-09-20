var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        sync(function () {

        }, function (err, channel) {
            if (err) {
                app.set('log').error(err.stack);
                res.send(500);
                return;
            }
            res.send(channel);
        });
    };
};