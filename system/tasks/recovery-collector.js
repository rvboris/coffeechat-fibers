var sync = require('sync');

module.exports = function (app) {
    var name = 'recovery';

    return {
        name: name,
        interval: 7200, // 2 hours
        callback: function (recipient, stop, interval) {
            sync(function () {
                if (app.PasswordRecovery.count.sync(app.PasswordRecovery, {}) === 0) {
                    stop();
                    return;
                }
                app.PasswordRecovery.remove.sync(app.PasswordRecovery, { time: { $lt: new Date(new Date().getTime() - interval * 1000) } });
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