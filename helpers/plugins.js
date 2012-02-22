var fs   = require('fs');
var sync = require('sync');
var path = require('path');
var file = require('file');

function flatten (array) {
    var flat = [];
    for (var i = 0, l = array.length; i < l; i++) {
        var type = Object.prototype.toString.call(array[i]).split(' ').pop().split(']').shift().toLowerCase();
        if (type) {
            flat = flat.concat(/^(array|collection|arguments|object)$/.test(type) ? flatten(array[i]) : array[i]);
        }
    }
    return flat;
}

module.exports = function(systemPath, pluginsPath, mask) {
    var files = file.walk.sync(file, systemPath);
    var plugins = fs.readdir.sync(fs, pluginsPath);
    var result = [];

    for (var i = 0; i < plugins.length; i++) {
        files = files.concat(file.walk.sync(file, path.normalize(pluginsPath + '/' + plugins[i])));
    }

    files = flatten(files);

    for (i = 0; i < files.length; i++) {
        if (files[i].match(mask) !== null) {
            result.push(files[i])
        }
    }

    return result;
}.async();