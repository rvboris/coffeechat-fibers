var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        sync(function () {
            if (req.body.user) {
                var settings = req.body.user.settings;

                if (settings['audio']) { // audio
                    req.user.settings['audio'].whenAway = typeof settings['audio'].whenAway !== 'undefined';
                    req.user.settings['audio'].whenUnavailable = typeof settings['audio'].whenUnavailable !== 'undefined';
                    req.user.settings['audio'].onMessage = typeof settings['audio'].onMessage !== 'undefined';
                    req.user.settings['audio'].onPrivate = typeof settings['audio'].onPrivate !== 'undefined';
                    req.user.settings['audio'].onMention = typeof settings['audio'].onMention !== 'undefined';
                    req.user.settings['audio'].onEnter = typeof settings['audio'].onEnter !== 'undefined';
                    req.user.settings['audio'].onExit = typeof settings['audio'].onExit !== 'undefined';

                    app.set('log').debug('user changed the audio settings');
                } else if (settings['interface']) { // interface
                    req.user.settings['interface'].flashTabOnMessage = typeof settings['interface'].flashTabOnMessage !== 'undefined';
                    req.user.settings['interface'].flashTabOnMention = typeof settings['interface'].flashTabOnMention !== 'undefined';
                    req.user.settings['interface'].chatNotifications = typeof settings['interface'].chatNotifications !== 'undefined';

                    app.set('log').debug('user changed the interface settings');
                }
            } else {
                switch (req.body.section) {
                    case 'audio':
                        req.user.settings['audio'].whenAway = false;
                        req.user.settings['audio'].whenUnavailable = false;
                        req.user.settings['audio'].onMessage = false;
                        req.user.settings['audio'].onPrivate = false;
                        req.user.settings['audio'].onMention = false;
                        break;
                    case 'interface':
                        req.user.settings['interface'].flashTabOnMessage = false;
                        req.user.settings['interface'].flashTabOnMention = false;
                }
            }

            req.user.save.sync(req.user);
            app.set('log').debug('user settings saved');

            res.send(req.user.settings);
        }, function (err) {
            if (err) {
                if (err.name && err.name === 'ValidationError') {
                    res.send({ error: 'Недопустимые данные настроек' });
                    return;
                }
                app.set('log').error(err.stack);
                res.send(500);
            }
        });
    }
};
