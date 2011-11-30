var sync = require('sync');

module.exports = function (app) {
    var run = false;
    var cycle;

    function stop() {
        app.set('log').debug('recovery collector stop');
        clearInterval(cycle);
        run = false;
    }

    return function () {
        if (run) return;
        run = true;

        app.set('log').debug('recovery collector start');

        cycle = setInterval(function () {
            sync(function () {
                if (app.PasswordRecovery.count.sync(app.PasswordRecovery, {}) == 0) return stop();
                app.PasswordRecovery.remove.sync(app.PasswordRecovery, { time: { $lt: new Date(new Date().getTime() - 7200000) } });
            }, function (err) {
                if (err) {
                    app.set('log').error(err.stack);
                    return stop();
                }
            });
        }, 7200000);
    };
};