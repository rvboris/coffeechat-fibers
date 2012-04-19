var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        if (!req.isXMLHttpRequest || req.session.user.id === '0') {
            res.send(401);
            return;
        }

        if (!req.params.name) {
            app.set('log').debug('user name param not found');
            res.send(404);
            return;
        }

        sync(function () {
            var profileUser = app.User.findOne.sync(app.User, { name: req.params.name, '_id': { $nin: app.set('systemUserIds') } }, ['name', 'pic', 'status', 'gender', 'points']);
            var me = app.User.findById.sync(app.User, req.session.user.id, ['ignore']);

            if (!profileUser || !me) {
                app.set('log').debug('user not found');
                res.send(404);
                return;
            }

            if (profileUser.isSystem()) {
                res.send(403);
                return;
            }

            res.send({
                name: profileUser.name,
                pic: profileUser.pic,
                status: profileUser.status,
                gender: profileUser.gender,
                messages: app.Message.count.sync(app.Message, { userId: profileUser.id }),
                points: profileUser.points,
                isIgnore: me.ignore.indexOf(profileUser.name) > -1
            });
        }, function (err) {
            if (!err) return;

            app.set('log').error(err.stack);
            res.send(500);
        });
    };
};
