var sync = require('sync');

module.exports = function (app) {
    return function (req, res) {
        if (!req.body.channel) {
            app.set('log').debug('channel data not found');
            res.send(404);
            return;
        }

        if (!req.body.channel.name) {
            app.set('log').debug('channel name not found');
            res.send({ error: 'Вы не ввели имя комнаты' });
            return;
        }

        if (!req.body.channel.url) {
            app.set('log').debug('channel url not found');
            res.send({ error: 'Вы не ввели URL комнаты' });
            return;
        }

        sync(function () {
            if (app.Channel.count.sync(app.Channel, { owner: req.user.id }) >= 3) {
                res.send({ error: 'Вы не можете создавать более 3 комнат' });
                return;
            }

            if (app.Channel.count.sync(app.Channel, { name: req.body.channel.name }) >= 1) {
                res.send({ error: 'Комната с таким именем уже существует' });
                return;
            }

            if (app.Channel.count.sync(app.Channel, { url: req.body.channel.url }) >= 1) {
                res.send({ error: 'Комната с таким URL уже существует' });
                return;
            }

            var channel = new app.Channel({
                name: req.body.channel.name,
                url: req.body.channel.url,
                hidden: typeof req.body.channel.hidden !== 'undefined',
                owner: req.user.id
            });

            if (req.body.channel.description) {
                channel.description = req.body.channel.description;
            }

            if (req.body.channel.password) {
                channel.secret = req.body.channel.password;
            }

            channel.save.sync(channel);

            return {
                channel: channel,
                count: app.Channel.count.sync(app.Channel, { hidden: false, private: false })
            };
        }, function (err, result) {
            if (err) {
                if (err.name && err.name === 'ValidationError') {
                    if (err.errors.name) {
                        res.send({ error: 'Имя должно быть от 4 до 30 знаков. Допускаются только русские и латинские буквы и цифры'});
                        return;
                    }

                    if (err.errors.url) {
                        res.send({ error: 'URL должен быть от 4 до 30 знаков. Допускаются только латинские буквы и цифры'});
                        return;
                    }

                    if (err.errors.description) {
                        res.send({ error: 'Описание должно быть от 10 до 100 знаков. Допускаются только русские и латинские буквы и цифры'});
                        return;
                    }

                    if (err.errors.password) {
                        res.send({ error: 'Пароль должен быть от 6 до 30 символов'});
                        return;
                    }

                    res.send({ error: 'Недопустимые данные для создания комнаты' });
                } else {
                    app.set('log').error(err.stack);
                    res.send(500);
                    return;
                }
            }

            app.set('syncServer').task('channel', 'start');

            if (!result.channel.hidden) {
                app.set('faye').bayeux.getClient().publish('/channel-list', {
                    token: app.set('serverToken'),
                    action: 'add',
                    channel: {
                        id: result.channel.id,
                        name: result.channel.name,
                        url: result.channel.url
                    },
                    count: result.count
                }).callback(function () {
                    res.send({ id: result.channel.id, url: result.channel.url });
                });
            } else {
                res.send({ id: result.channel.id, url: result.channel.url });
            }
        });
    };
};