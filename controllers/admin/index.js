var sync = require('sync');

module.exports = function(app) {
    return function(req, res) {
        if (req.session.user.id === '0') return res.send(403);

        sync(function() {
            var user = app.User.findById.sync(app.User, req.session.user.id, ['role']);
            if (user.role !== 'R') return res.send(403);
            res.render('admin/index', {
                env: app.set('argv').env,
                csrf: req.session._csrf,
                layout: 'admin/layout'
            });
        }, function(err) {
            if (err) {
                app.set('log').error(err.stack);
                return res.send(500);
            }
        });
    };
};