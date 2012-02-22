var log = require('log');

module.exports = function(level) {
    log = new log(level);
    var workerId = process.env.NODE_WORKER_ID;

    function prefixMessage (args) {
        workerId ? args[0] = 'W' + workerId + ' ' + args[0] : args[0] = 'M ' + args[0];
        return args;
    }

    return {
        error: function() {
            log.error.apply(log, prefixMessage(arguments));
        },
        debug: function() {
            log.debug.apply(log, prefixMessage(arguments));
        },
        info: function() {
            log.info.apply(log, prefixMessage(arguments));
        },
        notice: function() {
            log.notice.apply(log, prefixMessage(arguments));
        },
        warning: function() {
            log.warning.apply(log, prefixMessage(arguments));
        },
        alert: function() {
            log.alert.apply(log, prefixMessage(arguments));
        },
        critical: function() {
            log.critical.apply(log, prefixMessage(arguments));
        },
        emergency: function() {
            log.emergency.apply(log, prefixMessage(arguments));
        }
    };
};