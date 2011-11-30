var express      = require('express');
var connect      = require('connect');
var jade         = require('jade');
var faye         = require('faye');
var stylus       = require('stylus');
var mongoose     = require('mongoose');
var redisStore   = require('connect-redis')(express);
var log          = require('log');
var crypto       = require('crypto');
var sync         = require('sync');
var dnode        = require('dnode');
var rbytes       = require('rbytes');
var mime         = require('mime');
var httpProxy    = require('http-proxy');
var secure       = require('./system/secure.js');
var EventEmitter = require('events').EventEmitter;
var nconf        = require('nconf');
var app          = express.createServer();
var subServer    = express.createServer();
var proxy        = new httpProxy.RoutingProxy();
var argv         = require('optimist')
                        ['default']({ port: 3030, sync: 5000, env: 'development', num: 1 })
                        ['usage']('Usage: $0 --port [port] --sync [port] --env [environment] --num [number]').argv;

sync(function(){
    var Loader = function() {
        this.preInit();
        this.init();
        this.postInit();
    };

    Loader.prototype.preInit = function() {
        app.set('argv', argv);
        if (process.argv.NODE_ENV) process.argv.NODE_ENV = app.set('argv').env;
        nconf.use('file', { file: __dirname + '/config/' + app.set('argv').env + '.json' });
        app.set('host', app.set('argv').port == 3030 ? nconf.get('hostname') : (nconf.get('hostname') + ':' + app.set('argv').port));
    };

    Loader.prototype.init = function() {
        app.use(require('./helpers/detect.js')(app.set('host')));

        switch (app.set('argv').env) {
            case 'development':
                this.developmentSetup();
                break;
            case 'production':
                this.productionSetup();
        }

        this.assets();
        this.mimeSetup();
        this.exceptions();
        this.globalView();
        this.middleware();
        this.globalMongo();
    };

    Loader.prototype.postInit = function() {
        this.globalHelpers();
        this.globalFaye();
        this.fayeExtensions();
    };

    Loader.prototype.developmentSetup = function() {
        app.set('log', new log(log.DEBUG));
        app.set('log').info('development mode');

        app.use(express.logger({ format: '\x1b[1m:method\x1b[0m \x1b[33m:url\x1b[0m :response-time ms' }));
        app.use(express.static(__dirname + '/public/stylesheets'));
        app.use(stylus.middleware({
            src: __dirname + '/assets/stylus',
            dest: __dirname + '/public/stylesheets',
            compile: function(str, path) {
                return stylus(str).set('filename', path).set('compress', true);
            }
        }));
        app.use(express['static'](__dirname + '/public'));
    };

    Loader.prototype.productionSetup = function() {
        app.set('log', new log(log.INFO));
        app.set('log').info('production mode');

        app.use(express.vhost('hg.*', subServer));
        app.use(express.vhost('m.*', app));

        subServer.all('*', function(req, res) {
            if (req.subdomains[0] == 'hg') proxy.proxyRequest(req, res, { host: '127.0.0.1', port: 4545 });
        });
    };

    Loader.prototype.assets = function() {
        app.set('log').debug('load assets');

        var paths = {
            assets: __dirname + '/assets',
            public: __dirname + '/public'
        };

        paths.js = { root: paths.assets + '/javascripts' };
        paths.js.jqueryPlugins = paths.js.root + '/jquery.plugins';
        paths.js.library = paths.js.root + '/library';

        paths.css = {
            root: paths.assets + '/stylesheets',
            stylus: paths.assets + '/stylus'
        };

        var options = {
            uglifyjs:      true,
            cssvendor:     false,
            cssdataimg:    false,
            cssimport:     false,
            cssabspath:    false,
            csshost:       false,
            htmlabspath:   false,
            htmlhost:      false,
            cssmin:        true,
            jstransport:   false,
            texttransport: false
        };

        require('./helpers/assets.js')(app, paths, options)();
    };

    Loader.prototype.mimeSetup = function() {
        mime.define({ 'audio/ogg': ['ogg'], 'audio/x-mp3': ['mp3'] });
    };

    Loader.prototype.exceptions = function() {
        app.set('log').debug('handle exceptions');
        app.use(express.errorHandler({ dumpExceptions: true }));
        process.on('uncaughtException', function(err) {
            app.set('log').error(err.stack);
        });
    };

    Loader.prototype.globalView = function() {
        app.set('log').debug('setup redis');
        app.set('views', __dirname + '/assets/jade');
        app.set('view engine', 'jade');
        app.set('view options', { layout: false });
    };

    Loader.prototype.middleware = function() {
        app.set('log').debug('setup middleware');
        app.use(express.bodyParser());
        app.use(express.cookieParser());
    };

    Loader.prototype.globalMongo = function() {
        app.set('log').debug('setup mongo');
        mongoose.connect(nconf.get('mongodb'));

        app.set('models', require('./models.js'));
        app.set('models').define.sync(app.set('models'), app, mongoose);

        app.User = mongoose.model('User');
        app.Channel = mongoose.model('Channel');
        app.Subscription = mongoose.model('Subscription');
        app.Message = mongoose.model('Message');
        app.PasswordRecovery = mongoose.model('PasswordRecovery');
    };

    Loader.prototype.globalHelpers = function() {
        app.set('log').debug('setup helpers');
        app.set('helpers', {
            channel: require('./helpers/channel.js')(app),
            user: require('./helpers/user.js')(app),
            lang: require('./helpers/lang.js')
        });
    };

    Loader.prototype.globalFaye = function() {
        app.set('log').debug('setup faye');
        app.set('faye', {
            timeout: nconf.get('faye').timeout,
            bayeux: new faye.NodeAdapter({
                mount  : nconf.get('faye').bayeux.mount,
                timeout: nconf.get('faye').bayeux.timeout,
                engine: {
                    type: 'redis',
                    host: nconf.get('redis').host,
                    port: nconf.get('redis').port,
                    password: nconf.get('redis').pass,
                    namespace: nconf.get('faye').bayeux.store.namespace,
                    database: nconf.get('faye').bayeux.store.database
                }
            })
        });
    };

    Loader.prototype.fayeExtensions = function() {
        app.set('events', require('./system/events.js')(app));
        app.set('faye').bayeux.addExtension(require('./system/core.js')(app));
    };

    Loader.prototype.synchronize = function() {
        app.set('log').debug('synchronizing...');
        var tKey = rbytes.randomBytes(24).toHex();
        this.dnode(this.syncEvents(tKey), tKey);
    };

    Loader.prototype.syncEvents = function(tKey) {
        var starter = new EventEmitter;

        starter.on('serverToken', function(key, syncServer) {
            app.set('log').debug('server token received successful');
            app.set('serverToken', secure.dec(key, tKey));
            syncServer.keys.getServerKey(tKey, function(key) {
                starter.emit('serverKey', key, syncServer);
            });
        });

        starter.on('serverKey', function(key, syncServer) {
            app.set('log').debug('server key received successful');
            app.set('serverKey', secure.dec(key, tKey));
            syncServer.keys.getSessionKey(tKey, function(key) {
                starter.emit('sessionKey', key, syncServer);
            });
        });

        starter.on('sessionKey', function(key, syncServer) {
            app.set('log').debug('session key received successful');
            app.set('sessionKey', secure.dec(key, tKey));
            app.use(express.session({
                store: new redisStore(nconf.get('redis')),
                secret: app.set('sessionKey'),
                cookie: nconf.get('session').cookie
            }));

            require('./controllers/routes.js')(app);
            app.set('log').debug('routes loaded');

            syncServer.getChannels(function(channels) {
                starter.emit('channels', channels, syncServer);
            });
        });

        starter.on('channels', function(channels, syncServer) {
            sync(function() {
                return {
                    main: app.Channel.findById.sync(app.Channel, channels.mainChannel),
                    xxx: app.Channel.findById.sync(app.Channel, channels.xxxChannel),
                    quizeton: app.Channel.findById.sync(app.Channel, channels.quizetonChannel)
                };
            }, function(err, channels) {
                if (err) return app.set('log').error(err.stack);

                if (channels.main == null || channels.xxx == null || channels.quizeton == null) {
                    throw new Error('main channels not found');
                }

                app.set('log').debug('channels received successful');

                app.set('mainChannel', channels.main);
                app.set('xxxChannel', channels.xxx);
                app.set('quizetonChannel', channels.quizeton);

                starter.emit('start', syncServer);
            });
        });

        starter.on('start', function(syncServer) {
            app.set('syncServer', syncServer);

            if (!module.parent) {
                app.set('faye').bayeux.attach(app);

                if (app.set('argv').env == 'production') {
                    app.listen(app.set('argv').port, '127.0.0.1');
                } else {
                    app.listen(app.set('argv').port);
                }

                app.set('log').info('main server number ' + app.set('argv').num + ' started on port ' + app.set('argv').port);
            }
        });

        return starter;
    };

    Loader.prototype.dnode = function(starter, tKey) {
        dnode({
            publish: function(channel, data) {
                data.token = app.set('serverToken');
                app.set('faye').bayeux.getClient().publish(channel, data);
            },
            event: function() {
                var args = arguments;
                sync(function() {
                    switch (args[0]) {
                        case 'userUnsubscribe':
                            args[1] = app.User.findById.sync(app.User, args[1]);
                            args[2] = app.Subscription.findById.sync(app.Subscription, args[2]);
                            break;
                    }
                }, function(err) {
                    if (err) return app.set('log').error(err.stack);
                    app.set('events').emit.apply(app.set('events'), args);
                });
            }
        }).connect(app.set('argv').sync, '127.0.0.1', function (syncServer) {
            syncServer.keys.getServerToken(tKey, function(key) {
                starter.emit('serverToken', key, syncServer);
            });
        });
    };

    return new Loader();
}, function(err, loader) {
    if (err) return console.log(err.stack);

    loader.synchronize();
});