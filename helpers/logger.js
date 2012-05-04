var moment   = require('moment');
var workerId = process.env.NODE_WORKER_ID;

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

function getWorker (args) {
    var lastArgument = args[args.length - 1];
    if (typeof lastArgument === 'object' && lastArgument.worker) return 'W' + lastArgument.worker;
    if (workerId) return 'W' + workerId;
    return 'M';
}

function log (app, levelStr, args) {
    var i = 1;
    var msg;

    if (typeof args[0] === 'string') {
        msg = args[0].replace(/%s/g, function () {
            return args[i++]
        });
    } else {
        msg = args[0].toString();
    }

    if (!workerId) {
        msg += '\n';
        msg = '[' + moment().format('DD.MM.YY HH:mm:ss Z') + '] [' + getWorker(args) + '] ' + levelStr + ' ' + msg;
        if (app.set('logserver')) app.set('logserver').log(msg);
        if (levels[levelStr] > level || !args[0]) return;
        process.stdout.write(msg);
    } else {
        process.send({ cmd: 'log', msg: msg, params: {
            lvl: levelStr.toLowerCase(),
            worker: workerId
        }});
    }
}

module.exports = function (lvl, app) {
    if ('string' === typeof lvl) level = levels[lvl.toUpperCase()] || levels.DEBUG;

    return {
        emergency: function () {
            log(app, 'EMERGENCY', arguments);
        },
        alert: function () {
            log(app, 'ALERT', arguments);
        },
        critical: function () {
            log(app, 'CRITICAL', arguments);
        },
        error: function () {
            log(app, 'ERROR', arguments);
        },
        warning: function () {
            log(app, 'WARNING', arguments);
        },
        notice: function () {
            log(app, 'NOTICE', arguments);
        },
        info: function () {
            log(app, 'INFO', arguments);
        },
        debug: function () {
            log(app, 'DEBUG', arguments);
        }
    }
};