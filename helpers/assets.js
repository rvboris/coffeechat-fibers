var ams    = require('ams');
var stylus = require('stylus');
var sync   = require('sync');
var fs     = require('fs');

module.exports = function(env, paths, options) {
    function compileWebAssets () {
        // jquery
        ams.build
            .create(paths.js.root)
            .add([ paths.js.library + '/jquery.js' ])
            .combine({ js: 'jquery-standalone.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        // jquery + jquery.ui
        ams.build
            .create(paths.js.root)
            .add([
                paths.js.library + '/jquery.js',
                paths.js.library + '/jquery-ui.js'
            ])
            .combine({ js: 'jquery.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        // loader
        ams.build
            .create(paths.js.root)
            .add([
                paths.js.library + '/modernizr.js',
                paths.js.library + '/yepnope.js'
            ])
            .combine({ js: 'loader.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        // jquery.sys.plugins
        ams.build
            .create(paths.js.root)
            .add([
                paths.js.jqueryPlugins + '/jquery.browser.js',
                paths.js.jqueryPlugins + '/jquery.activity.js',
                paths.js.jqueryPlugins + '/jquery.notifier.js',
                paths.js.jqueryPlugins + '/jquery.emoticons.js',
                paths.js.jqueryPlugins + '/jquery.serialize.js',
                paths.js.jqueryPlugins + '/jquery.autoresize.js',
                paths.js.library + '/audio-fx.js',
                paths.js.library + '/faye.js'
            ])
            .combine({ js: 'jquery.system.plugins.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        // jquery.ufc.plugins
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
                paths.js.jqueryPlugins + '/jquery.uploadify.js',
                paths.js.jqueryPlugins + '/jquery.qtip.js',
                paths.js.library + '/gibberish-aes.js',
                paths.js.library + '/jstorage.js',
                paths.js.library + '/mote.js'
            ])
            .combine({ js: 'jquery.interface.plugins.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        // jquery.placeholder
        ams.build
            .create(paths.js.root)
            .add(paths.js.jqueryPlugins + '/jquery.placeholder.js')
            .combine({ js: 'jquery.placeholder.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        // jquery.bootstrap
        ams.build
            .create(paths.js.root)
            .add(paths.js.library + '/bootstrap.js')
            .combine({ js: 'bootstrap.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        // jquery.sys
        var webSystem = ams.build
            .create(paths.js.root)
            .add(paths.js.root + '/web/jquery.sys.js');

        if (env === 'production') webSystem.process(options);

        webSystem.combine({ js: 'jquery.system.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        // jquery.ufc
        var webInterface = ams.build
            .create(paths.js.root)
            .add(paths.js.root + '/web/jquery.ufc.js');

        if (env === 'production') webInterface.process(options);

        webInterface.combine({ js: 'jquery.interface.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        // jquery.recovery
        var webRecovery = ams.build
            .create(paths.js.root)
            .add(paths.js.root + '/web/jquery.recovery.js');

        if (env === 'production') webRecovery.process(options);

        webRecovery.process(options)
            .combine({ js: 'jquery.recovery.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        // jquery.contact
        var webContact = ams.build
            .create(paths.js.root)
            .add(paths.js.root + '/web/jquery.contact.js');

        if (env === 'production') webContact.process(options);

        webContact.process(options)
            .combine({ js: 'jquery.contact.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        // jquery.archive
        var webArchive = ams.build
            .create(paths.js.root)
            .add(paths.js.root + '/web/jquery.archive.js');

        if (env === 'production') webArchive.process(options);

        webArchive.process(options)
            .combine({ js: 'jquery.archive.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        // jquery.about
        var webAbout = ams.build
            .create(paths.js.root)
            .add(paths.js.root + '/web/jquery.about.js');

        if (env === 'production') webAbout.process(options);

        webAbout.process(options)
            .combine({ js: 'jquery.about.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        // jquery.admin
        var webAdmin = ams.build
            .create(paths.js.root)
            .add(paths.js.root + '/web/jquery.admin.js');

        if (env === 'production') webAdmin.process(options);

        webAdmin.process(options)
            .combine({ js: 'jquery.admin.js' })
            .write(paths['public'] + '/javascripts/web')
            .end();

        // plugins.css
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

        // ie9.css
        ams.build
            .create(paths.css.root)
            .add(paths.css.root + '/web/ie9.css')
            .process(options)
            .combine({ css: 'ie9.css' })
            .write(paths['public'] + '/stylesheets/web')
            .end();

        // bootstrap.css
        ams.build
            .create(paths.css.root)
            .add(paths.css.root + '/web/bootstrap.css')
            .add(paths.css.root + '/web/bootstrap-responsive.css')
            .process(options)
            .combine({ css: 'bootstrap.css' })
            .write(paths['public'] + '/stylesheets/web')
            .end();

        // compile stylus for production
        if (env === 'production') {
            ams.build
                .create(paths.css.stylus)
                .add([
                    paths.css.stylus + '/web/style.styl',
                    paths.css.stylus + '/web/page.styl',
                    paths.css.stylus + '/web/print.styl',
                    paths.css.stylus + '/web/admin.styl',
                    paths.css.stylus + '/mobile/style.styl',
                    paths.css.stylus + '/mobile/page.styl'
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
        // jquery.mobile
        ams.build
            .create(paths.js.root)
            .add([paths.js.library + '/jquery.js', paths.js.library + '/jquery-mobile.js'])
            .combine({ js: 'jquery.js' })
            .write(paths['public'] + '/javascripts/mobile')
            .end();

        // jquery.mobile.css
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