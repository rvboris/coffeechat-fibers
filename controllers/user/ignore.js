var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        if (!req.body.toUser || !req.body.action) {
            app.set('log').debug('toUser or action param not found');
            res.send(404);
            return;
        }

        if (req.user.isSystem()) {
            res.send({ error: 'Системные пользователи не могут добавлять в игнор' });
            return;
        }

        sync(function () {
            var toUser = app.User.findOne.sync(app.User, { name: req.body.toUser, '_id': { $nin: app.set('systemUserIds') } });

            if (!toUser) {
                return { error: 'Пользователь не найден' };
            }

            var idx = req.user.ignore.indexOf(toUser.name);

            if (req.body.action === 'add') {
                if (idx < 0) {
                    req.user.ignore.push(toUser.name);
                    req.user.save.sync(req.user);
                    app.set('log').debug('user ignored');
                } else {
                    app.set('log').debug('user alredy ignored');
                }
            } else if (req.body.action === 'remove') {
                if (idx < 0) {
                    app.set('log').debug('user not ingored');
                } else {
                    req.user.ignore = req.user.ignore.splice(idx, 1);
                    req.user.save.sync(req.user);
                }
            }

            return req.user.ignore;
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