var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        if (!req.isXMLHttpRequest || req.session.user.id === '0') {
            res.send(401);
            return;
        }

        sync(function () {
            var user = app.User.findById.sync(app.User, req.session.user.id);

            if (!user) {
                app.set('log').debug('user not found');
                res.send(404);
                return;
            }

            if (req.body.user) {
                var settings = req.body.user.settings;

                if (settings['audio']) { // audio
                    user.settings['audio'].whenAway = typeof settings['audio'].whenAway !== 'undefined';
                    user.settings['audio'].whenUnavailable = typeof settings['audio'].whenUnavailable !== 'undefined';
                    user.settings['audio'].onMessage = typeof settings['audio'].onMessage !== 'undefined';
                    user.settings['audio'].onPrivate = typeof settings['audio'].onPrivate !== 'undefined';
                    user.settings['audio'].onMention = typeof settings['audio'].onMention !== 'undefined';
                    user.settings['audio'].onEnter = typeof settings['audio'].onEnter !== 'undefined';
                    user.settings['audio'].onExit = typeof settings['audio'].onExit !== 'undefined';

                    app.set('log').debug('user changed the audio settings');
                } else if (settings['interface']) { // interface
                    user.settings['interface'].flashTabOnMessage = typeof settings['interface'].flashTabOnMessage !== 'undefined';
                    user.settings['interface'].flashTabOnMention = typeof settings['interface'].flashTabOnMention !== 'undefined';
                    user.settings['interface'].chatNotifications = typeof settings['interface'].chatNotifications !== 'undefined';

                    app.set('log').debug('user changed the interface settings');
                }
            } else {
                switch (req.body.section) {
                    case 'audio':
                        user.settings['audio'].whenAway = false;
                        user.settings['audio'].whenUnavailable = false;
                        user.settings['audio'].onMessage = false;
                        user.settings['audio'].onPrivate = false;
                        user.settings['audio'].onMention = false;
                        break;
                    case 'interface':
                        user.settings['interface'].flashTabOnMessage = false;
                        user.settings['interface'].flashTabOnMention = false;
                }
            }

            user.save.sync(user);
            app.set('log').debug('user settings saved');

            res.send(user.settings);
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
