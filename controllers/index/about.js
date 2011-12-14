module.exports = function() {
    return function(req, res) {
        res.render(req.mobile ? 'mobile/about' : 'web/about');
    };
};