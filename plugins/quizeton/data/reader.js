var fs   = require('fs');
var sync = require('sync');

module.exports = function (filename, bufferSize) {
    if (!bufferSize) bufferSize = 1024;

    function random (from, to) {
        return Math.floor(Math.random() * (to - from + 1) + from);
    }

    var fileSize = 0;

    var readQuizLine = function () {
        if (fileSize == 0) fileSize = fs.stat.sync(fs, filename).size;
        var fd = fs.open.sync(fs, filename, 'r');
        var line = null;
        while (line == null) {
            var buffer = fs.read.sync(fs, fd, bufferSize, random(0, fileSize - bufferSize), 'utf8')[0];
            line = buffer.substring(buffer.indexOf('\n'), buffer.lastIndexOf('\n')).match(/.+\|.+\S/);
        }
        fs.close.sync(fs, fd);
        return line[0];
    }.async();

    return {
        getQuiz: function () {
            var line = readQuizLine.sync(this);
            var splitter = line.lastIndexOf('|');
            return {
                question: line.substr(0, splitter),
                answer: line.substr(splitter + 1, line.length)
            };
        }.async()
    };
};