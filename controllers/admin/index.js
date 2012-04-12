var sync  = require('sync');
var nconf = require('nconf');
var aes   = require('../../helpers/aes.js');

module.exports = function(app) {
    nconf.use('file', { file: __dirname + '/../../config/' + app.set('argv').env + '.json' });

    return function(req, res) {
        if (!req.haveAccess) return res.send(403);

        res.render('admin/index', {
            env: app.set('argv').env,
            csrf: req.session._csrf,
            layout: 'admin/layout',
            logServer: app.set('argv').logserver,
            secretKey: app.set('helpers').utils.base64.encode(aes.enc(req.session.user.id, app.set('serverKey'))),
            section: 'charts'
        });
    };
};