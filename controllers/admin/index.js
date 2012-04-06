var sync  = require('sync');
var nconf = require('nconf');

module.exports = function(app) {
    nconf.use('file', { file: __dirname + '/../../config/' + app.set('argv').env + '.json' });

    return function(req, res) {
        //if (req.session.user.id === '0') return res.send(403);

        sync(function() {
            //var user = app.User.findById.sync(app.User, req.session.user.id, ['role']);
            //if (user.role !== 'R') return res.send(403);
            res.render('admin/index', {
                env: app.set('argv').env,
                csrf: req.session._csrf,
                layout: 'admin/layout',
                logserver: app.set('argv').logserver,
                hostname: nconf.get('hostname')
            });
        }, function(err) {
            if (err) {
                app.set('log').error(err.stack);
                return res.send(500);
            }
        });
    };
};