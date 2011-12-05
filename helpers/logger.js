var log = require('log');

module.exports = function (level) {
    log = new log(level);
    var workerId = process.env.NODE_WORKER_ID;

    return {
        error:function (msg) {
            workerId ? log.error('W' + workerId + ' ' + msg) : log.error('M ' + msg);
        },
        debug:function (msg) {
            workerId ? log.debug('W' + workerId + ' ' + msg) : log.debug('M ' + msg);
        },
        info:function (msg) {
            workerId ? log.info('W' + workerId + ' ' + msg) : log.info('M ' + msg);
        },
        notice:function (msg) {
            workerId ? log.notice('W' + workerId + ' ' + msg) : log.notice('M ' + msg);
        },
        warning:function (msg) {
            workerId ? log.warning('W' + workerId + ' ' + msg) : log.warning('M ' + msg);
        },
        alert:function (msg) {
            workerId ? log.alert('W' + workerId + ' ' + msg) : log.alert('M ' + msg);
        },
        critical:function (msg) {
            workerId ? log.critical('W' + workerId + ' ' + msg) : log.critical('M ' + msg);
        }
    };
};