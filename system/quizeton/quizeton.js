var reader = require('./reader.js')(__dirname + '/data.txt');
var events = require('events');
var sync   = require('sync');

module.exports = function (app) {
    var recipient;
    var status = 'stop';
    var cycle;
    var timer;
    var quiz;
    var hintTime;
    var hintAnswer;
    var eventer = new events.EventEmitter();

    var settings = {
        waitTime: 20,
        hintInterval: 15,
        quizInterval: 10
    };

    eventer.on('error', function (err) {
        app.set('log').error(err.stack);
        eventer.emit('reply', 'Произошла ошибка, игра будет остановлена');
        stop();
    });

    eventer.on('reply', function (text, to) {
        recipient.publish('/channel/' + app.set('quizetonChannel').id, {
            text: text,
            name: '$',
            to: to
        });
    });

    eventer.on('nextQuiz', function () {
        sync(function () {
            var count = app.Subscription.count.sync(app.Subscription, {
                channelId: app.set('quizetonChannel').id
            });

            if (count == 0) {
                eventer.emit('reply', 'Игра приостановлена из-за отсутствия игроков');
                app.set('log').debug('game is suspended');
                return stop();
            }

            app.set('log').debug('next question');

            quiz = reader.getQuiz.sync(reader);
            hintTime = quiz.answer.length * settings.hintInterval;
            hintAnswer = '';
            timer = hintTime + settings.waitTime;
            eventer.emit('reply', 'Следующий вопрос: ' + quiz.question);

        }, function (err) {
            if (err) eventer.emit('error', err);
        });
    });

    eventer.on('hint', function () {
        var charNum = ((timer / settings.hintInterval) - quiz.answer.length) * -1;

        if ((charNum + 1) < quiz.answer.length) {
            hintAnswer += quiz.answer.charAt(charNum);
            eventer.emit('reply', 'Подказываю, ' + quiz.answer.length + ' ' + app.set('helpers').lang.plural(quiz.answer.length, 'буква', 'буквы', 'букв') + ' начинается на "' + hintAnswer + '".');
            app.set('log').debug('hint players');
        } else {
            timer = 0;
            eventer.emit('reply', 'К сожалению никто правильно не ответил, ответ "' + quiz.answer + '".');
            app.set('log').debug('no correct answers');
        }
    });

    function stop() {
        clearInterval(cycle);
        if (status != 'start') return;
        status = 'stop';
        app.set('log').debug('stop quizeton');
    }

    app.set('log').debug('quizeton is loaded');

    return {
        start: function (client) {
            if (status == 'start' || status == 'pause') return;
            recipient = client;

            app.set('log').debug('start quizeton');

            sync(function () {
                quiz = reader.getQuiz.sync(reader);
                hintTime = quiz.answer.length * settings.hintInterval;
                hintAnswer = '';
                timer = hintTime + settings.waitTime;

                cycle = setInterval(function () {
                    switch (status) {
                        case 'pause':
                            return;
                        case 'stop':
                            status = 'start';
                            return eventer.emit('reply', 'Игра началась! Первый вопрос: ' + quiz.question);
                        case 'start':
                            if (timer <= hintTime) {
                                if (timer <= 0) {
                                    eventer.emit('nextQuiz');
                                } else if ((timer % settings.hintInterval) == 0) {
                                    eventer.emit('hint');
                                }
                            }
                    }

                    timer--;
                }, 1000);
            }, function (err) {
                if (err) eventer.emit('error');
            });
        },
        newQuiz: function (client, userId) {
            recipient = client;
            app.set('log').debug('obtained the correct answer, a new quiz');

            var points = hintAnswer.length == 0 ? quiz.answer.length + 5 : quiz.answer.length - hintAnswer.length;

            sync(function () {
                var user = app.User.findById.sync(app.User, userId);
                user.points += points;
                return user.save.sync(user);
            }, function (err, user) {
                if (err) return eventer.emit('error');
                eventer.emit('reply', 'Поздравляю это правильный ответ! +' + points + ' (' + user.points + ').', [user.name]);
            });

            status = 'pause';

            setTimeout(function () {
                status = 'start';
                timer = 0;
            }, settings.quizInterval * 1000);
        },
        getAnswer: function (client) {
            recipient = client;
            return quiz.answer;
        },
        getStatus:function (client) {
            recipient = client;
            return status;
        }
    };
};