var sync = require('sync');

module.exports = function(app) {
    return function(req, res) {
        if (!req.params.channel) {
            app.set('log').debug('channel param not found');
            return res.send(404);
        }

        sync(function() {
            var user = req.session.user.id !== '0' ? app.User.findById.sync(app.User, req.session.user.id) : req.session.user;
            if (!user) throw new Error('user not found');

            var channel = app.Channel.findOne.sync(app.Channel, { url: req.params.channel });
            if (!channel) {
                app.set('log').debug('channel not found');
                return res.send(404);
            }

            if (channel.private) return res.send(401);

            res.render(req.mobile ? 'mobile' : 'web', {
                user     : app.set('helpers').user.createPrivate(user),
                channels : {
                    main: {
                        id  : app.set('channels').main.id,
                        name: app.set('channels').main.name,
                        url : app.set('channels').main.url
                    },
                    req : {
                        id  : channel.id,
                        name: channel.name,
                        url : channel.url
                    }
                },
                serverKey: app.set('serverKey'),
                title    : channel.name,
                env      : app.set('argv').env,
                errors   : null
            });
        }, function(err) {
            if (err) {
                app.set('log').error(err.stack);
                res.send(500);
            }
        });
    }
};