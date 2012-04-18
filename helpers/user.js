var sync = require('sync');

module.exports = function(app) {
    return {
        create: function(name, password, role) {
            var user = app.User.findOne.sync(app.User, { name: name });

            if (user) {
                app.set('log').debug('user "%s" loaded', name);
                return user;
            }

            user = new app.User({ name: name, secret: password, role: role || 'U' });
            user.save.sync(user);
            return user;
        }.async(),
        getUserObjects: function(users) {
            for (var i = 0, userObjects = {}; i < users.length; i++) {
                userObjects[users[i].name] = app.User.findById.sync(app.User, users[i].userId);
                userObjects[users[i].name].params = users[i];
            }
            return userObjects;
        }.async(),
        session: function(req, res, next) {
            if (req.session.user && req.session.user.id !== '0') {
                sync(function() {
                    var user = app.User.findById.sync(app.User, req.session.user.id, []);
                    return user ? user.id : '0';
                }, function(err, id) {
                    if (err) {
                        app.set('log').error(err.stack);
                        return next();
                    }
                    req.session.user = { id: id };
                    app.set('log').debug('login through the session');
                    next();
                });
            } else {
                req.session.user = { id: '0' };
                app.set('log').debug('login through the session');
                next();
            }
        },
        rootAccess: function(req, res, next) {
            if (req.session.user.id === '0') {
                req.haveAccess = false;
                return next();
            }

            sync(function() {
                return app.User.findById.sync(app.User, req.session.user.id, ['role']);
            }, function(err, user) {
                if (err) {
                    app.set('log').error(err.stack);
                    return next();
                }

                req.haveAccess = user.isSystem() && user.role === 'R';

                next();
            });
        },
        createPublic: function(user) {
            return {
                name: user.name,
                gender: user.gender,
                status: user.status
            };
        },
        createPrivate: function(user) {
            return {
                id: user.id,
                pic: user.pic,
                name: user.name,
                email: user.email,
                gender: user.gender,
                status: user.status,
                ignore: user.ignore,
                settings: user.settings
            };
        }
    };
};