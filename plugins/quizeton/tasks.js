var sync   = require('sync');
var reader = require('./data/reader.js')(__dirname + '/data/data.txt');
var events = require('events');
var path   = require('path');

module.exports = function(app) {
    var name = path.basename(__dirname);
    var status = 'stop';
    var eventer = new events.EventEmitter();
    var timer;
    var quiz;
    var hintTime;
    var hintAnswer;

    var settings = {
        waitTime: 20,
        hintInterval: 15,
        quizInterval: 10
    };

    eventer.setMaxListeners(4);

    eventer.on('reply', function(recipient, text, to) {
        recipient.publish('/channel/' + app.set('channels')[name].id, {
            text: text,
            name: '$',
            to: to || []
        });
    });

    eventer.on('nextQuiz', function(recipient, stop) {
        sync(function() {
            var count = app.Subscription.count.sync(app.Subscription, {
                channelId: app.set('channels')[name].id
            });

            if (count === 0) {
                eventer.emit('reply', recipient, 'Игра приостановлена из-за отсутствия игроков');
                return stop();
            }

            app.set('log').debug('next question');

            quiz = reader.getQuiz.sync(reader);
            hintTime = quiz.answer.length * settings.hintInterval;
            hintAnswer = '';
            timer = hintTime + settings.waitTime;
            eventer.emit('reply', recipient, 'Следующий вопрос: ' + quiz.question);

        }, function(err) {
            if (err) eventer.emit('error', recipient, err);
        });
    });

    eventer.on('hint', function(recipient) {
        var charNum = ((timer / settings.hintInterval) - quiz.answer.length) * -1;

        if ((charNum + 1) < quiz.answer.length) {
            hintAnswer += quiz.answer.charAt(charNum);
            eventer.emit('reply', recipient, 'Подказываю, ' + quiz.answer.length + ' ' + app.set('helpers').lang.plural(quiz.answer.length, 'буква', 'буквы', 'букв') + ' начинается на "' + hintAnswer + '".');
            app.set('log').debug('hint players');
        } else {
            timer = 0;
            eventer.emit('reply', recipient, 'К сожалению никто правильно не ответил, ответ "' + quiz.answer + '".');
            app.set('log').debug('no correct answers');
        }
    });

    eventer.on('error', function(recipient, err) {
        app.set('log').error(err.stack);
        eventer.emit('reply', recipient, 'Произошла ошибка, игра будет остановлена');
        stop();
    });


    return {
        name: name,
        interval: 1,
        callback: function(recipient, stop) {
            switch (status) {
                case 'pause':
                    return;
                case 'stop':
                    status = 'start';
                    return eventer.emit('reply', recipient, 'Игра началась! Первый вопрос: ' + quiz.question);
                case 'start':
                    if (timer <= hintTime) {
                        if (timer <= 0) {
                            eventer.emit('nextQuiz', recipient, stop);
                        } else if ((timer % settings.hintInterval) === 0) {
                            eventer.emit('hint', recipient);
                        }
                    }
            }

            timer--;
        },
        syncObject: {
            start: function(recipient) {
                if (status === 'start' || status === 'pause') return;

                app.set('log').debug('start quizeton');

                sync(function() {
                    quiz = reader.getQuiz.sync(reader);
                    hintTime = quiz.answer.length * settings.hintInterval;
                    hintAnswer = '';
                    timer = hintTime + settings.waitTime;

                    app.set('tasks')[name].start(recipient);
                }, function(err) {
                    if (err) eventer.emit('error', recipient, err);
                });
            },
            newQuiz: function(recipient, userId) {
                app.set('log').debug('obtained the correct answer, a new quiz');

                var points = hintAnswer.length === 0 ? quiz.answer.length + 5 : quiz.answer.length - hintAnswer.length;

                sync(function() {
                    var user = app.User.findById.sync(app.User, userId);
                    user.points += points;
                    return user.save.sync(user);
                }, function(err, user) {
                    if (err) return eventer.emit('error', recipient);
                    eventer.emit('reply', recipient, 'Поздравляю это правильный ответ! +' + points + ' (' + user.points + ').', [user.name]);
                });

                status = 'pause';

                setTimeout(function() {
                    status = 'start';
                    timer = 0;
                }, settings.quizInterval * 1000);
            },
            getAnswer: function() {
                return quiz.answer;
            },
            getStatus: function() {
                return status;
            }
        }
    };
};