var sync = require('sync');

module.exports = function(app) {
    return {
        create: function(params) {
            var channel = app.Channel.findOne.sync(app.Channel, { name: params.name });

            if (channel) {
                app.set('log').debug('channel "%s" loaded', params.name);

                /* var messages = app.Message.find.sync(app.Message, { channelId: channel.id }); */
                /* for (var i = 0; i < messages.length; i++) messages[i].remove.sync(messages[i]); */

                return channel;
            }

            channel = new app.Channel(params);
            channel.save.sync(channel);
            app.set('log').debug('channel "%s" created', params.name);

            return channel;
        }.async(),
        subscribe: function(user, channelId) {
            var channel = app.Channel.findById.sync(app.Channel, channelId);
            var subscription = app.Subscription.findOne.sync(app.Subscription, { userId: user.id, channelId: channelId });

            if (!channel) {
                app.set('log').debug('channel not found');
                return { error: 'Комната не найдена' };
            }

            if (subscription) {
                subscription.time = new Date();
                subscription.save.sync(subscription);

                if (user.status === 'F') {
                    user.status = 'O';
                    user.save.sync(user);
                }

                app.set('log').debug('subscription time updated');

                return { channel: channel, subscription: subscription, update: true };
            }

            var newSubscription = new app.Subscription({ userId: user.id, channelId: channel.id, time: new Date() });
            newSubscription.save.sync(newSubscription);

            user.status = 'O';
            user.save.sync(user);

            if (!user.isSystem()) {
                app.set('faye').bayeux.getClient().publish('/channel/' + channel.id + '/users', {
                    token: app.set('serverToken'),
                    action: 'connect',
                    user: app.set('helpers').user.createPublic(user)
                });
            }

            return { channel: channel, subscription: newSubscription, update: false };
        }.async(),
        getChannelObjects: function(channels) {
            for (var i = 0, channelObjects = {}; i < channels.length; i++) {
                channelObjects[channels[i].name] = app.Channel.findById.sync(app.Channel, channels[i].channelId);
                channelObjects[channels[i].name].params = channels[i];
            }
            return channelObjects;
        }.async(),
        getToken: function(message) {
            return message.token ? message.token : message.data && message.data.token ? message.data.token : false;
        },
        group: function(original) {
            var grouped = [];
            var copy = original.slice(0);

            for (var i = 0; i < original.length; i++) {
                var myCount = 0;
                for (var w = 0; w < copy.length; w++) {
                    if (original[i] == copy[w]) {
                        myCount++;
                        delete copy[w];
                    }
                }
                if (myCount > 0) {
                    var a = new Object();
                    a.id = original[i];
                    a.diff = myCount;
                    grouped.push(a);
                }
            }
            return grouped;
        }
    }
};