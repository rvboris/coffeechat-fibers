module.exports = function(app) {
    return function(req, res) {
        try {
            res.render((req.mobile ? 'mobile' : 'web') + '/about', {
                title: 'О проекте',
                env: app.set('argv').env
            });
        } catch (e) {
            app.set('log').error(e.stack);
        }
    };
};