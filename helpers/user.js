var sync = require('sync');

module.exports = function (app) {
    return {
        create: function (name, password, role) {
            var user = app.User.findOne.sync(app.User, { name: name });

            if (user) {
                app.set('log').debug('user "%s" loaded', name);

                if ((role === 'R' || role === 'S') && app.set('argv').env === 'production') {
                    user.secret = password;
                    user.role = role;
                    user.save.sync(user);
                }
            } else {
                user = new app.User({ name: name, secret: password, role: role || 'U' });
                user.save.sync(user);
            }

            return user;
        }.async(),
        getUserObjects: function (users) {
            for (var i = 0, userObjects = {}; i < users.length; i++) {
                userObjects[users[i].name] = app.User.findById.sync(app.User, users[i].userId);
                userObjects[users[i].name].params = users[i];
            }
            return userObjects;
        }.async(),
        session: function (req, res, next) {
            if (req.session.user && req.session.user.id !== '0') {
                sync(function () {
                    return app.User.findById.sync(app.User, req.session.user.id);
                }, function (err, user) {
                    if (err) {
                        app.set('log').error(err.stack);
                        next();
                        return;
                    }
                    req.session.user = { id: user ? user.id : '0' };
                    req.user = user || { id: '0' };
                    app.set('log').debug('login through the session');
                    next();
                });
            } else {
                req.session.user = req.user = { id: '0' };
                app.set('log').debug('login through the session');
                next();
            }
        },
        rootAccess: function (req, res, next) {
            req.user.isSystem() && req.user.role === 'R' ? next() : res.send(403);
        },
        userAccess: function (req, res, next) {
            req.user && req.user.id !== '0' ? next() : res.send(403);
        },
        xhrAccess: function (req, res, next) {
            req.xhr ? next() : res.send(401);
        },
        createPublic: function (user) {
            return {
                name: user.name,
                gender: user.gender,
                status: user.status
            };
        },
        createPrivate: function (user) {
            return {
                id: user.id,
                pic: user.pic,
                name: user.name,
                email: user.email,
                gender: user.gender,
                status: user.status,
                ignore: user.ignore,
                settings: user.settings,
                role: user.role,
                channelsOwner: user.id === '0' ? [] : app.Channel.find.sync(app.Channel, { owner: user.id }, '_id').map(function (channel) {
                    return channel.id;
                }) || []
            };
        }.async()
    };
};