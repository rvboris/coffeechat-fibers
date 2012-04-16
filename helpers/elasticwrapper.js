var sync = require('sync');

module.exports = function(app) {
    function asyncCommand(cmd, args, callback) {
        app.set('esClient')[cmd].apply(app.set('esClient'), args)
            .on('error', function(err) {
                (cmd === 'createIndex' || cmd === 'deleteIndex') ? callback(null) : callback(err);
            })
            .on('data', function(data) {
                data = JSON.parse(data);
                if (data.error) {
                    if (cmd === 'createIndex' || cmd === 'deleteIndex') return;
                    app.set('log').debug('ElasticSearch: ' + data.error);
                } else {
                    if (cmd === 'count') return callback(null, data.count);
                    if (cmd === 'search') return callback(null, data.hits.total === 0 ? [] : data.hits.hits);
                }
            })
            .on('done', function() {
                callback(null);
            })
            .exec();
    }

    return function() {
        var args = Array.prototype.slice.call(arguments);
        var cmd = args.shift();
        var callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;

        sync(function() {
            return asyncCommand.sync(this, cmd, args);
        }, function(err, result) {
            if (callback) {
                err ? callback(err) : callback(null, result);
            } else {
                if (err) app.set('log').error(err.stack);
            }
        })
    }
};