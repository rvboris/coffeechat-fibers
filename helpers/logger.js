var moment   = require('moment');
var workerId = process.env.NODE_WORKER_ID;
var hook;

var levels = {
    EMERGENCY: 0,
    ALERT:     1,
    CRITICAL:  2,
    ERROR:     3,
    WARNING:   4,
    NOTICE:    5,
    INFO:      6,
    DEBUG:     7
};

var level = levels.DEBUG;

function log(levelStr, args) {
    if (levels[levelStr] > level || !args[0]) return;
    var i = 1;
    var msg = moment().format('DD.MM.YY HH:mm:ss (z)') + ' ' + (workerId ? 'W' + workerId : 'M') + ' ' + levelStr + ' ' + args[0].replace(/%s/g, function() { return args[i++] }) + '\n';
    if (typeof hook === 'function') hook(msg);
    process.stdout.write(msg);
}

module.exports = function(lvl) {
    if ('string' === typeof lvl) level = levels[lvl.toUpperCase()] || levels.DEBUG;

    return {
        emergency: function(msg) {
            log('EMERGENCY', arguments);
        },
        alert: function(msg) {
            log('ALERT', arguments);
        },
        critical: function(msg) {
            log('CRITICAL', arguments);
        },
        error: function(msg) {
            log('ERROR', arguments);
        },
        warning: function(msg) {
            log('WARNING', arguments);
        },
        notice: function(msg) {
            log('NOTICE', arguments);
        },
        info: function(msg) {
            log('INFO', arguments);
        },
        debug: function(msg) {
            log('DEBUG', arguments);
        },
        setHook: function(fn) {
            hook = fn;
        },
        unsetHook: function() {
            hook = null;
        }
    }
};