module.exports = function (req, res) {
    if (!req.isXMLHttpRequest) {
        res.send(401);
        return;
    }
    res.send(200);
};