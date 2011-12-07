module.exports = function() {
    return function(req, res) {
        res.render(req.mobile ? 'partials/mobile/ulogin' : 'partials/web/ulogin');
    };
};