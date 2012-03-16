var cluster = require('cluster');
var master  = require('./system/master.js');
var worker  = require('./system/worker.js');
var argv    = require('optimist')
    ['default']({ port: 3000, sync: 5000, env: 'development', workers: 2 })
    ['usage']('Usage: $0 --port [port] --sync [port] --env [environment] --workers [number]').argv;

if (cluster.isMaster) {
    master(argv);
} else {
    worker(argv);
}