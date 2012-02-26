var sync   = require('sync');
var moment = require('moment');

module.exports = function(app) {
    moment.lang('ru');

    return function(req, res) {
        if (!req.params.message) {
            app.set('log').debug('message param not found');
            return res.send(404);
        }

        sync(function() {
            var message = app.Message.findById.sync(app.Message, req.params.message, ['time', 'text', 'userId']);
            if (!message) {
                return app.set('log').debug('message not found');
            }

            var user = app.User.findById.sync(app.User, message.userId.toHexString(), ['name']);
            if (!user) {
                return app.set('log').debug('user not found');
            }

            message.timeString = moment(new Date(message.time)).format('DD.MM.YY H:mm:ss'); // TODO: 24h time format (moment.js bug?)

            return { message: message, user: user };
        }, function(err, result) {
            if (err) {
                app.set('log').error(err.stack);
                return res.send(500);
            }

            if (!result) return res.send(404);

            try {
                res.render((req.mobile ? 'mobile' : 'web') + '/message', {
                    title: 'Сообщение ID ' + result.message.id,
                    data: result,
                    env: app.set('argv').env,
                    layout: (req.mobile ? 'mobile' : 'web') + '/archive/layout'
                });
            } catch (e) {
                app.set('log').error(err.stack);
                return res.send(500);
            }
        });
    }
};