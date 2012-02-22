var ams    = require('ams');
var stylus = require('stylus');
var sync   = require('sync');
var fs     = require('fs');

module.exports = function(env, paths, options) {
    function compileWebAssets () {
        // Javascripts
        ams.build
            .create(paths.js.root)
            .add([paths.js.library + '/jquery.js', paths.js.library + '/jquery-ui.js'])
            .combine({ js: 'jquery.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        var webSystem = ams.build
            .create(paths.js.root)
            .add(paths.js.root + '/web/jquery.sys.js');

        if (env === 'production') {
            webSystem.process(options);
        }

        webSystem.combine({ js: 'jquery.system.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        var webInterface = ams.build
            .create(paths.js.root)
            .add(paths.js.root + '/web/jquery.ufc.js');

        if (env === 'production') {
            webInterface.process(options);
        }

        webInterface.combine({ js: 'jquery.interface.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        var webRecovery = ams.build
            .create(paths.js.root)
            .add(paths.js.root + '/web/jquery.recovery.js');

        if (env === 'production') {
            webRecovery.process(options);
        }

        webRecovery.process(options)
            .combine({ js: 'jquery.recovery.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        var webContact = ams.build
            .create(paths.js.root)
            .add(paths.js.root + '/web/jquery.contact.js');

        if (env === 'production') {
            webContact.process(options);
        }

        webContact.process(options)
            .combine({ js: 'jquery.contact.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        ams.build
            .create(paths.js.root)
            .add([
                paths.js.library + '/modernizr.js',
                paths.js.library + '/yepnope.js'
            ])
            .combine({ js: 'loader.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        ams.build
            .create(paths.js.root)
            .add([
                paths.js.jqueryPlugins + '/jquery.browser.js',
                paths.js.jqueryPlugins + '/jquery.activity.js',
                paths.js.jqueryPlugins + '/jquery.notifier.js',
                paths.js.jqueryPlugins + '/jquery.emoticons.js',
                paths.js.jqueryPlugins + '/jquery.serialize.js',
                paths.js.library + '/audio-fx.js',
                paths.js.library + '/faye.js'
            ])
            .combine({ js: 'jquery.system.plugins.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        ams.build
            .create(paths.js.root)
            .add([
                paths.js.jqueryPlugins + '/jquery.mousewheel.js',
                paths.js.jqueryPlugins + '/jquery.blockUI.js',
                paths.js.jqueryPlugins + '/jquery.scrollTo.js',
                paths.js.jqueryPlugins + '/jquery.hoverIntent.js',
                paths.js.jqueryPlugins + '/jquery.jail.js',
                paths.js.jqueryPlugins + '/jquery.scroller.js',
                paths.js.jqueryPlugins + '/jquery.accordion.js',
                paths.js.jqueryPlugins + '/jquery.resize.js',
                paths.js.library + '/gibberish-aes.js',
                paths.js.library + '/jstorage.js',
                paths.js.jqueryPlugins + '/jquery.uploadify.js',
                paths.js.jqueryPlugins + '/jquery.qtip.js'
            ])
            .combine({ js: 'jquery.interface.plugins.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        ams.build
            .create(paths.js.root)
            .add(paths.js.jqueryPlugins + '/jquery.placeholder.js')
            .combine({ js: 'jquery.placeholder.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        // Stylesheets
        ams.build
            .create(paths.css.root)
            .add([
                paths.css.root + '/web/reset.css',
                paths.css.root + '/web/jquery.qtip.css'
            ])
            .process(options)
            .combine({ css: 'plugins.css' })
            .write(paths['public'] + '/stylesheets/web')
            .end();

        ams.build
            .create(paths.css.root)
            .add(paths.css.root + '/web/ie9.css')
            .process(options)
            .combine({ css: 'ie9.css' })
            .write(paths['public'] + '/stylesheets/web')
            .end();

        if (env === 'production') {
            ams.build
                .create(paths.css.stylus)
                .add([
                    paths.css.stylus + '/web/style.styl',
                    paths.css.stylus + '/web/archive.styl',
                    paths.css.stylus + '/web/print.styl',
                    paths.css.stylus + '/mobile/style.styl',
                    paths.css.stylus + '/mobile/archive.styl'
                ])
                .process(function(path, data) {
                    delete this.data[path];
                    var css = stylus(data).set('filename', path).set('compress', true);
                    this.data[path.replace(/\.[styl]+$/, '.css')] = css.render.sync(css);
                })
                .write(paths['public'] + '/stylesheets')
                .end();
        }
    }

    function compileMobileAssets () {
        // Javascripts
        ams.build
            .create(paths.js.root)
            .add([paths.js.library + '/jquery.js', paths.js.library + '/jquery-mobile.js'])
            .combine({ js: 'jquery.js' })
            .write(paths['public'] + '/javascripts/mobile')
            .end();

        // Stylesheets
        ams.build
            .create(paths.css.root)
            .add(paths.css.root + '/mobile/jquery.mobile.css')
            .process(options)
            .combine({ css: 'plugins.css' })
            .write(paths['public'] + '/stylesheets/mobile')
            .end();
    }

    return function() {
        sync(function() {
            ams.build
                .create(paths['public'])
                .cleanup(paths['public'] + '/javascripts')
                .cleanup(paths['public'] + '/stylesheets')
                .end();

            compileWebAssets();
            //compileMobileAssets();

        }, function(err) {
            if (err) console.log(err.stack);
        });
    }
};