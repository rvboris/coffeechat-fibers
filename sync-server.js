var express  = require('express');
var dnode    = require('dnode');
var rbytes   = require('rbytes');
var bcrypt   = require('bcrypt');
var log      = require('log');
var mongoose = require('mongoose');
var secure   = require('./system/secure.js');
var sync     = require('sync');
var nconf    = require('nconf');
var app      = express.createServer();
var argv     = require('optimist')
                        ['default']({ port: 5000, env: 'development', time: 5000 })
                        ['usage']('Usage: $0 --port [port] --env [environment] --time [ms]').argv;

sync(function() {
    var Loader = function() {
        this.preInit();
        this.init();
    };

    Loader.prototype.preInit = function() {
        app.set('argv', argv);
        app.set('salt', bcrypt.gen_salt_sync(10));
        app.set('serverToken', bcrypt.encrypt_sync(rbytes.randomBytes(16).toHex(), app.set('salt')));
        app.set('serverKey', bcrypt.encrypt_sync(rbytes.randomBytes(16).toHex(), app.set('salt')));
        app.set('sessionKey', bcrypt.encrypt_sync(rbytes.randomBytes(16).toHex(), app.set('salt')));

        process.argv.NODE_ENV = app.set('argv').env;

        nconf.use('file', { file: __dirname + '/config/' + app.set('argv').env + '.json' });
    };

    Loader.prototype.init = function() {
        switch (app.set('argv').env) {
            case 'production':
                app.set('log', new log(log.INFO));
                app.set('log').info('production mode');
                break;
            case 'development':
                app.set('log', new log(log.DEBUG));
                app.set('log').info('development mode');
        }

        this.exceptions();
        this.mongodb();
        this.globalHelpers();
        this.globalChannels();
        this.globalProcess();
    };

    Loader.prototype.exceptions = function() {
        app.use(express.errorHandler({ dumpExceptions: true }));
        process.on('uncaughtException', function(err) {
            app.set('log').error(err.stack);
        });
    };

    Loader.prototype.mongodb = function() {
        mongoose.connect(nconf.get('mongodb'));

        app.set('models', require('./models.js'));
        app.set('models').define.sync(app.set('models'), app, mongoose);

        app.User = mongoose.model('User');
        app.Channel = mongoose.model('Channel');
        app.Subscription = mongoose.model('Subscription');
        app.Message = mongoose.model('Message');
        app.PasswordRecovery = mongoose.model('PasswordRecovery');

        app.set('log').debug('models loaded');

        if (app.set('argv').env == 'development') {
            app.set('models').removeCollections.sync(app.set('models'), mongoose);
            app.set('log').debug('collections removed');
        }

        app.Subscription.remove.sync(app.Subscription, {});
    };

    Loader.prototype.globalHelpers = function() {
        app.set('helpers', {
            channel: require('./helpers/channel.js')(app),
            user: require('./helpers/user.js')(app),
            lang: require('./helpers/lang.js')
        });

        app.set('log').debug('helpers loaded');
    };

    Loader.prototype.globalChannels = function() {
        app.set('mainChannel', app.set('helpers').channel.create.sync(app.set('helpers').channel, 'Гостинная', 'main'));
        app.set('xxxChannel', app.set('helpers').channel.create.sync(app.set('helpers').channel, 'Кроватка', 'xxx'));
        app.set('quizetonChannel', app.set('helpers').channel.create.sync(app.set('helpers').channel, 'Викторина', 'quizeton'));
    };

    Loader.prototype.globalProcess = function() {
        app.set('quizeton', require('./system/quizeton/quizeton.js')(app));
        app.set('collector', require('./process/collector.js')(app));
        app.set('recovery', require('./process/recovery.js')(app));
    };

    new Loader();
}, function(err) {
    if (err) return console.log(err.stack);

    var clients = [];

    dnode(function (client, conn) {
        conn.on('ready', function() {
            clients[conn.id] = client;
            app.set('log').debug('client connected');
        });

        conn.on('end', function () {
            delete clients[conn.id];
            app.set('log').debug('client disconnected');
        });

        this.keys = {
            getServerToken: function (tKey, callback) {
                callback(secure.enc(app.set('serverToken'), tKey));
            },
            getServerKey: function (tKey, callback) {
                callback(secure.enc(app.set('serverKey'), tKey));
            },
            getSessionKey: function (tKey, callback) {
                callback(secure.enc(app.set('sessionKey'), tKey));
            }
        };

        this.getChannels = function (callback) {
            callback({
                mainChannel: app.set('mainChannel').id,
                xxxChannel: app.set('xxxChannel').id,
                quizetonChannel: app.set('quizetonChannel').id
            });
        };

        this.getValue = function(num, key, callback) {
            callback(app.set(key));
        };

        this.setValue = function(num, key, value) {
            app.set(key, value);
        };

        this.collector = {
            start: function(timeout) {
                app.set('collector')(clients[conn.id], timeout);
            }
        };

        this.recovery = {
            start: function() {
                app.set('recovery')();
            }
        };

        this.quizeton = {
            start: function() {
                app.set('quizeton').start(clients[conn.id]);
            },
            newQuiz: function(userId) {
                app.set('quizeton').newQuiz(clients[conn.id], userId);
            },
            getStatus: function(callback) {
                callback(app.set('quizeton').getStatus(clients[conn.id]));
            },
            getAnswer: function(callback) {
                callback(app.set('quizeton').getAnswer(clients[conn.id]));
            }
        };
    }).listen(app.set('argv').port, '127.0.0.1');

    app.set('log').info('sync server start listening on port ' + app.set('argv').port);
});