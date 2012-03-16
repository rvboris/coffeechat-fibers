var sync = require('sync');

module.exports = function(app) {
    return function(req, res) {
        if (!req.isXMLHttpRequest || req.session.user.id === '0') return res.send(401);

        if (!req.body.toUser || !req.body.action) {
            app.set('log').debug('toUser or action param not found');
            return res.send(404);
        }

        sync(function() {
            var toUser = app.User.findOne.sync(app.User, { name: req.body.toUser, '_id': { $nin: app.set('systemUserIds') } }, ['name']);
            var fromUser = app.User.findById.sync(app.User, req.session.user.id, ['name']);

            switch (req.body.action) {
                case 'request':
                    var subscriptions = app.Subscription.find.sync(app.Subscription, { userId: fromUser.id }, ['channelId']);
                    for (var i = 0; i < subscriptions.length; i++) {
                        var channel = app.Channel.findById.sync(app.Channel, subscriptions[i].channelId, ['name', 'url', 'private']);
                        if (!channel || !channel['private']) continue;
                        if (app.Subscription.count.sync(app.Subscription, { channelId: channel.id, userId: toUser.id }) === 0) continue;

                        app.set('faye').bayeux.getClient().publish('/user/' + toUser.id, {
                            token: app.set('serverToken'),
                            action: 'private.reopen',
                            fromUser: { name: fromUser.name },
                            toUser: { name: toUser.name },
                            privateChannel: {
                                id: channel.id,
                                name: channel.name,
                                url: channel.url
                            }
                        });
                        return { data: { id: channel.id, name: channel.name, url: channel.url }};
                    }
                    app.set('faye').bayeux.getClient().publish('/user/' + toUser.id, {
                        token: app.set('serverToken'),
                        action: 'private.request',
                        fromUser: { name: fromUser.name },
                        toUser: { name: toUser.name }
                    });
                    break;
                case 'yes':
                    var query = app.Channel.findOne({ 'private': true }, ['name', 'url']).sort('_id', -1);
                    channel = query.execFind.sync(query);

                    var num = channel.length > 0 ? (parseInt(channel[0].url.match(/\d+$/)[0]) + 1) : 1;
                    channel = app.set('helpers').channel.create.sync(app.set('helpers').channel, {
                        'name': 'Приват #' + num,
                        'url': 'prv' + num,
                        'private': true,
                        'owner': toUser.id
                    });

                    app.set('faye').bayeux.getClient().publish('/user/' + toUser.id, {
                        token: app.set('serverToken'),
                        action: 'private.yes',
                        fromUser: { name: fromUser.name },
                        toUser: { name: toUser.name },
                        privateChannel: {
                            id: channel.id,
                            name: channel.name,
                            url: channel.url
                        }
                    });
                    return { data: { id: channel.id, name: channel.name, url: channel.url }};
                case 'no':
                    app.set('faye').bayeux.getClient().publish('/user/' + toUser.id, {
                        token: app.set('serverToken'),
                        action: 'private.no',
                        fromUser: { name: fromUser.name },
                        toUser: { name: toUser.name }
                    });
            }
        }, function(err, result) {
            if (err) {
                app.set('log').error(err.stack);
                return res.send(500);
            }

            if (!result) return res.send(200);
            if (result.error) return res.send(result);
            if (result.data) return res.send(result.data);

            res.send(500);
        });
    }
};