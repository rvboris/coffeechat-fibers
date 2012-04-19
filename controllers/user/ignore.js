var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        if (!req.isXMLHttpRequest || req.session.user.id === '0') {
            res.send(401);
            return;
        }

        if (!req.body.toUser || !req.body.action) {
            app.set('log').debug('toUser or action param not found');
            res.send(404);
            return;
        }

        sync(function () {
            var toUser = app.User.findOne.sync(app.User, { name: req.body.toUser, '_id': { $nin: app.set('systemUserIds') } });
            var fromUser = app.User.findById.sync(app.User, req.session.user.id);

            if (fromUser.isSystem()) return;

            var idx = fromUser.ignore.indexOf(toUser.name);

            if (req.body.action === 'add') {
                if (idx < 0) {
                    fromUser.ignore.push(toUser.name);
                    fromUser.save.sync(fromUser);
                    app.set('log').debug('user ignored');
                } else {
                    app.set('log').debug('user alredy ignored');
                }
            } else if (req.body.action === 'remove') {
                if (idx < 0) {
                    app.set('log').debug('user not ingored');
                } else {
                    fromUser.ignore = fromUser.ignore.splice(idx, 1);
                    fromUser.save.sync(fromUser);
                }
            }

            return fromUser.ignore;
        }, function (err, result) {
            if (err) {
                app.set('log').error(err.stack);
                res.send(500);
                return;
            }

            if (result) {
                res.send(result);
                return;
            }

            res.send(200);
        });
    };
};