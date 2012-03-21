module.exports = function(app) {
    return function(req, res) {
        try {
            return res.render((req.mobile ? 'mobile' : 'web') + '/about', {
                title: 'О проекте',
                env: app.set('argv').env,
                csrf: req.session._csrf
            });
        } catch (e) {
            app.set('log').error(e.stack);
            res.send(500);
        }
    };
};