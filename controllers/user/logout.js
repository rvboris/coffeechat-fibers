module.exports = function (req, res) {
    if (!req.isXMLHttpRequest || req.session.user.id === '0') return res.send(401);
    req.session.destroy();
    res.send(200);
};