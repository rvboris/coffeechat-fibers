module.exports = function (req, res) {
    if (!req.isXMLHttpRequest || req.session.user.id === '0') {
        res.send(401);
        return;
    }
    req.session.destroy();
    res.send(200);
};