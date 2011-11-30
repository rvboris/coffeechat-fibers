module.exports = function (req, res) {
    if (!req.isXMLHttpRequest) res.send(401);
    res.send(200);
};