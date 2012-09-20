var aes = require('../../helpers/aes.js');

module.exports = function (app) {
    return function (req, res) {
        app.set('syncServer').getTasks(function (tasks) {
            res.render('admin/tasks', {
                env: app.set('argv').env,
                csrf: req.session._csrf,
                layout: 'admin/layout',
                logServer: app.set('argv').logserver,
                secretKey: app.set('helpers').utils.base64.encode(aes.enc(req.session.user.id, app.set('serverKey'))),
                section: 'tasks',
                tasks: tasks
            });
        });
    };
};