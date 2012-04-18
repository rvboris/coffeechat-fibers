var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        if (!req.params.channel) {
            app.set('log').debug('channel param not found');
            res.send(404);
            return;
        }

        sync(function () {
            var user;

            if (req.session.user.id !== '0') {
                user = app.User.findById.sync(app.User, req.session.user.id)
            } else {
                user = req.session.user;
            }

            if (!user) {
                throw new Error('user not found');
            }

            var channel = app.Channel.findOne.sync(app.Channel, {
                url: req.params.channel
            }, ['name', 'url', 'private']);

            if (!channel) {
                app.set('log').debug('channel not found');
                res.send(404);
                return;
            }

            if (channel['private']) {
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
                    },
                    req: {
                        id: channel.id,
                        name: channel.name,
                        url: channel.url
                    }
                },
                serverKey: app.set('serverKey'),
                title: channel.name,
                env: app.set('argv').env,
                csrf: req.session._csrf,
                errors: null
            });
        }, function (err) {
            if (!err) return;

            app.set('log').error(err.stack);
            res.send(500);
        });
    };
};