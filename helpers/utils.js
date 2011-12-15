module.exports.getUTCDate = function(date) {
    var now = date || new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()));
};

module.exports.isInt = function(n) {
    return typeof n == 'number' && n % 1 == 0;
};