module.exports = function(app) {
    return function(req, res) {
        try {
            res.render('admin/index', {
                env: app.set('argv').env,
                csrf: req.session._csrf,
                layout: '/admin/layout'
            });
        } catch (e) {
            app.set('log').error(e.stack);
        }
    };
};