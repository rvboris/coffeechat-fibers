var cluster = require('cluster');
var argv    = require('optimist')
    ['default']({ port : 3000, sync : 5000, env : 'development', workers : 2 })
    ['usage']('Usage: $0 --port [port] --sync [port] --env [environment] --workers [number]').argv;

if (cluster.isMaster) {
    require('./system/master.js')(argv);
} else {
    require('./system/worker.js')(argv);
}