var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        sync(function () {
            var profileUser = app.User.findOne.sync(app.User, {
                name: req.params.name,
                '_id': { $nin: app.set('systemUserIds') }
            }, ['name', 'pic', 'status', 'gender', 'points']);

            if (!profileUser) {
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
                isIgnore: req.user.ignore.indexOf(profileUser.name) > -1
            });
        }, function (err) {
            if (!err) return;

            app.set('log').error(err.stack);
            res.send(500);
        });
    };
};
