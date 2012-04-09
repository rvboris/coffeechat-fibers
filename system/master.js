var path      = require('path');
var cluster   = require('cluster');
var express   = require('express');
var dnode     = require('dnode');
var rbytes    = require('rbytes');
var bcrypt    = require('bcrypt');
var logger    = require('../helpers/logger.js');
var logserver = require('./logserver.js');
var mongoose  = require('mongoose');
var sync      = require('sync');
var nconf     = require('nconf');
var app       = express.createServer();
var aes       = require('../helpers/aes.js');
var task      = require('./task.js');

module.exports = function(argv) {
    sync(function() {
        var Loader = function() {
            this.preInit();
            return this.init();
        };

        Loader.prototype.preInit = function() {
            app.set('argv', argv);
            app.set('salt', bcrypt.genSaltSync(10));
            app.set('serverToken', bcrypt.hashSync(rbytes.randomBytes(16).toHex(), app.set('salt')));
            app.set('serverKey', bcrypt.hashSync(rbytes.randomBytes(16).toHex(), app.set('salt')));
            app.set('sessionKey', bcrypt.hashSync(rbytes.randomBytes(16).toHex(), app.set('salt')));

            process.argv.NODE_ENV = app.set('argv').env;

            nconf.use('file', { file: __dirname + '/../config/' + app.set('argv').env + '.json' });
        };

        Loader.prototype.init = function() {
            switch (app.set('argv').env) {
                case 'production':
                    app.set('log', logger('INFO'));
                    app.set('log').info('production mode');
                    break;
                case 'development':
                    app.set('log', logger('DEBUG'));
                    app.set('log').info('development mode');
            }

            this.exceptions();
            this.mongo();
            this.helpers();

            function isOpen(port) {
                var isClosed = app.set('helpers').utils.checkPort.sync(app.set('helpers').utils, port, nconf.get('hostname'));
                if (isClosed) {
                    app.set('log').critical('port %s in use', port);
                    process.exit(1);
                }
            }

            isOpen(argv.port);
            isOpen(argv.sync);
            isOpen(argv.logserver);

            return this.plugins();
        };

        Loader.prototype.exceptions = function() {
            app.set('log').debug('handle exceptions');
            app.use(express.errorHandler({ dumpExceptions: true }));
            process.on('uncaughtException', function(err) {
                app.set('log').error(err.stack);
                process.exit(1);
            });
        };

        Loader.prototype.mongo = function() {
            app.set('log').debug('setup mongo');

            mongoose.connect(nconf.get('mongodb'));

            app.set('models', require('./models.js'));
            app.set('models').define.sync(app.set('models'), app, mongoose);

            app.User = mongoose.model('User');
            app.Channel = mongoose.model('Channel');
            app.Subscription = mongoose.model('Subscription');
            app.Message = mongoose.model('Message');
            app.PasswordRecovery = mongoose.model('PasswordRecovery');

            if (app.set('argv').env === 'development') {
                app.set('models').removeCollections.sync(app.set('models'), mongoose);
                app.set('log').debug('collections removed');
            }

            app.Subscription.remove.sync(app.Subscription, {});
        };

        Loader.prototype.helpers = function() {
            app.set('log').debug('setup helpers');
            app.set('helpers', {
                channel: require('../helpers/channel.js')(app),
                user: require('../helpers/user.js')(app),
                lang: require('../helpers/lang.js'),
                plugins: require('../helpers/plugins.js'),
                utils: require('../helpers/utils.js')
            });
        };

        Loader.prototype.plugins = function() {
            app.set('log').debug('setup plugins');
            var taskFiles = app.set('helpers').plugins.sync(app.set('helpers').plugins, path.normalize(__dirname + '/tasks'), path.normalize(__dirname + '/../plugins'), /(tasks\/|\/tasks.js)/);
            var channelFiles = app.set('helpers').plugins.sync(app.set('helpers').plugins, path.normalize(__dirname + '/channels'), path.normalize(__dirname + '/../plugins'), /(channels\/|\/channel.js)/);
            var userFiles = app.set('helpers').plugins.sync(app.set('helpers').plugins, path.normalize(__dirname + '/users'), path.normalize(__dirname + '/../plugins'), /(users\/|\/user.js)/);

            app.set('tasks', []);

            for (var i = 0; i < taskFiles.length; i++) {
                var taskObject = task(app, require(taskFiles[i])(app));
                app.set('tasks')[taskObject.task.name] = taskObject;
            }

            var users = [];

            for (i = 0; i < userFiles.length; i++) {
                users.push(require(userFiles[i]));
                users[i].userId = app.set('helpers').user.create.sync(app.set('helpers').user, users[i].name, users[i].password, users[i].role || 'U').id;
            }

            app.set('users', app.set('helpers').user.getUserObjects.sync(app.set('helpers').user, users));
            app.set('systemUserIds', []);

            for (var userName in app.set('users')) {
                app.set('systemUserIds').push(app.set('users')[userName].id);
            }

            var channels = [];

            for (i = 0; i < channelFiles.length; i++) {
                channels.push(require(channelFiles[i]));
                channels[i].channelId = app.set('helpers').channel.create.sync(app.set('helpers').channel, {
                    'name': channels[i].channel,
                    'url': channels[i].name,
                    'private': false,
                    'owner': app.set('users').root.id
                }).id;
            }

            app.set('channels', app.set('helpers').channel.getChannelObjects.sync(app.set('helpers').channel, channels));

            return { users: users, channels: channels };
        };

        return new Loader();
    }, function(err, plugins) {
        if (err) return console.log(err.stack);



        var clients = [];

        dnode(function(client, conn) {
            conn.on('ready', function() {
                clients[conn.id] = client;
                app.set('log').debug('client connected');
            });

            conn.on('end', function() {
                delete clients[conn.id];
                app.set('log').debug('client disconnected');
            });

            this.keys = {
                getServerToken: function(tKey, callback) {
                    callback(aes.enc(app.set('serverToken'), tKey));
                },
                getServerKey: function(tKey, callback) {
                    callback(aes.enc(app.set('serverKey'), tKey));
                },
                getSessionKey: function(tKey, callback) {
                    callback(aes.enc(app.set('sessionKey'), tKey));
                }
            };

            this.getChannels = function(callback) {
                callback(plugins.channels);
            };

            this.getUsers = function(callback) {
                callback(plugins.users);
            };

            this.task = function(plugin, command) {
                var args = Array.prototype.slice.call(arguments);
                args.shift();
                args.shift();
                args.unshift(clients[conn.id]);

                if (app.set('tasks')[plugin] && app.set('tasks')[plugin].task.syncObject && typeof app.set('tasks')[plugin].task.syncObject[command] === 'function') {
                    if (typeof args[args.length - 1] === 'function') {
                        args[args.length - 1](app.set('tasks')[plugin].task.syncObject[command].apply(app.set('tasks')[plugin].task.syncObject[command], args));
                    } else {
                        app.set('tasks')[plugin].task.syncObject[command].apply(app.set('tasks')[plugin].task.syncObject[command], args);
                    }
                }
            };
        }).listen(app.set('argv').sync, '127.0.0.1');

        app.set('log').info('master server start listening on port %s', app.set('argv').sync);

        (function() {
            app.set('log').debug('setup assets');

            var paths = {
                'assets': path.resolve(__dirname + '/../assets'),
                'public': path.resolve(__dirname + '/../public')
            };

            paths.js = { root: paths.assets + '/javascripts' };
            paths.js.jqueryPlugins = paths.js.root + '/jquery.plugins';
            paths.js.library = paths.js.root + '/library';

            paths.css = {
                root: paths.assets + '/stylesheets',
                stylus: paths.assets + '/stylus'
            };

            var options = {
                uglifyjs: true,
                cssvendor: false,
                cssdataimg: false,
                cssimport: false,
                cssabspath: false,
                csshost: false,
                htmlabspath: false,
                htmlhost: false,
                cssmin: true,
                jstransport: false,
                texttransport: false
            };

            require('../helpers/assets.js')(argv.env, paths, options)();
        })();

        logserver = logserver(app);

        for (var i = 0, workers = []; i < argv.workers; i++) {
            try {
                workers[i] = cluster.fork();
                workers[i].on('message', function (msg) {
                    if (msg.cmd && msg.cmd == 'log' && logserver.log) {
                        logserver.log(msg.msg);
                    }
                });
            } catch (e) {
                app.set('log').critical('worker fork error');
                process.exit(1);
            }
        }

        var stdout = process.stdout;

        app.set('helpers').utils.hook(stdout);

        stdout.hook('write', function(string) {
            logserver.log(string);
        });

        cluster.on('death', function(worker) {
            for (var i in workers) {
                if (workers[i].pid !== worker.pid) continue;
                app.set('log').debug('worker %s died. restart...', worker.pid);
                try {
                    workers[i] = cluster.fork();
                } catch (e) {
                    app.set('log').critical('worker fork error');
                    process.exit(1);
                }
            }
        });

        var signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

        for (i in signals) {
            process.on(signals[i], function() {
                for (var j in workers) workers[j].kill();
                process.exit(1);
            });
        }
    });
};