module.exports = function(app) {
    return function(req, res) {
        try {
            res.render(req.mobile ? 'partials/mobile/ulogin' : 'partials/web/ulogin');
        } catch (e) {
            app.set('log').error(e.stack);
        }
    };
};