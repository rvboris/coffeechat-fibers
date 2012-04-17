var sync = require('sync');

module.exports = function(app) {
    return function(req, res) {
        if (!req.isXMLHttpRequest || req.session.user.id === '0') return res.send(401);

        if (!req.body.toUser || !req.body.action) {
            app.set('log').debug('toUser or action param not found');
            return res.send(404);
        }

        sync(function() {
            var toUser = app.User.findOne.sync(app.User, { name: req.body.toUser, '_id': { $nin: app.set('systemUserIds') } });
            var fromUser = app.User.findById.sync(app.User, req.session.user.id);

            if (fromUser.isSystem()) return;

            var idx = fromUser.ignore.indexOf(toUser.name);

            switch (req.body.action) {
                case 'add':
                    if (idx < 0) {
                        fromUser.ignore.push(toUser.name);
                        fromUser.save.sync(fromUser);
                        app.set('log').debug('user ignored');
                    } else {
                        app.set('log').debug('user alredy ignored');
                    }
                    break;
                case 'remove':
                    if (idx < 0) {
                        app.set('log').debug('user not ingored');
                    } else {
                        fromUser.ignore = fromUser.ignore.splice(idx, 1);
                        fromUser.save.sync(fromUser);
                    }
            }

            return fromUser.ignore;
        }, function(err, result) {
            if (err) {
                app.set('log').error(err.stack);
                return res.send(500);
            }

            if (result) return res.send(result);

            res.send(200);
        });
    }
};