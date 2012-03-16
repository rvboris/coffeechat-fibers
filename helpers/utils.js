module.exports.getUTCDate = function(date) {
    var now = date || new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()));
};

module.exports.isInt = function(n) {
    return typeof n === 'number' && n % 1 === 0;
};

module.exports.getIp = function(req) {
    var ipAddress;
    var forwardedIpsStr = req.header('x-forwarded-for');

    if (forwardedIpsStr) {
        var forwardedIps = forwardedIpsStr.split(',');
        ipAddress = forwardedIps[0];
    }

    if (!ipAddress) {
        ipAddress = req.connection.remoteAddress;
    }

    return ipAddress;
};