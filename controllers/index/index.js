var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        sync(function () {
            var user;

            if (req.session.user.id !== '0') {
                user = app.User.findById.sync(app.User, req.session.user.id);
            } else {
                user = req.session.user
            }

            if (!user) {
                app.set('log').debug('user not found');
                res.send(401);
                return;
            }

            res.render(req.mobile ? 'mobile' : 'web', {
                user: app.set('helpers').user.createPrivate(user),
                channels: {
                    main: {
                        id: app.set('channels').main.id,
                        name: app.set('channels').main.name,
                        url: app.set('channels').main.url
                    }
                },
                serverKey: app.set('serverKey'),
                title: app.set('channels').main.name,
                env: app.set('argv').env,
                csrf: req.session._csrf,
                errors: null
            });
        }, function (err) {
            if (!err) return;

            app.set('log').error(err.stack);
            res.send(500);
        });
    }
};
