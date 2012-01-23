module.exports = function() {
    return function(req, res) {
        try {
            res.render(req.mobile ? 'mobile/about' : 'web/about');
        } catch (e) {
            app.set('log').error(e.stack);
        }
    };
};