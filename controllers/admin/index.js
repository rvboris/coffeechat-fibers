var aes = require('../../helpers/aes.js');

module.exports = function (app) {
    return function (req, res) {
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