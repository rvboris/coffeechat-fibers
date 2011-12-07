var sync = require('sync');

module.exports = function(app) {
    var name = 'recovery';

    return {
        name      : name,
        interval  : 7200, // 2 hours
        callback  : function(recipient, stop, interval) {
            sync(function() {
                if (app.PasswordRecovery.count.sync(app.PasswordRecovery, {}) === 0) return stop();
                app.PasswordRecovery.remove.sync(app.PasswordRecovery, { time: { $lt: new Date(new Date().getTime() - interval * 1000) } });
            }, function(err) {
                if (err) {
                    app.set('log').error(err.stack);
                    return stop();
                }
            });
        },
        syncObject: {
            start: function(recipient) {
                app.set('tasks')[name].start(recipient);
            }
        }
    };
};