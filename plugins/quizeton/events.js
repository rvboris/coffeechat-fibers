var moment = require('moment');
var sync   = require('sync');
var path   = require('path');

module.exports = function(app) {
    var name = path.basename(__dirname);

    return {
        name: name,
        userSubscribe: function(user, channel) {
            if (channel.id === app.set('channels')[name].id) {
                app.set('syncServer').task('quizeton', 'start');
            }
        },
        guestSubscribe: function(channel) {
            if (channel.id === app.set('channels')[name].id) {
                app.set('syncServer').task('quizeton', 'getStatus', function(status) {
                    if (status !== 'stop') return;
                    app.set('faye').bayeux.getClient().publish('/channel/' + app.set('channels')[name].id, {
                        token: app.set('serverToken'),
                        text: 'Чтобы начать игру необходимо авторизироваться.',
                        name: '$'
                    });
                });
            }
        },
        userSend: function(user, channel, text) {
            if (channel.id === app.set('channels')[name].id) {
                app.set('syncServer').task('quizeton', 'getAnswer', function(answer) {
                    if (text.toLowerCase() !== answer.toLowerCase()) return;
                    app.set('syncServer').task('quizeton', 'newQuiz', user.id);
                });
            }
        }
    }
};