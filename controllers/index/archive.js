var sync = require('sync');
var moment = require('moment');

module.exports = function(app) {
    moment.lang('ru');

    return function(req, res) {
        var collection;
        var channels;
        var channel;
        var docs;
        var pages;
        var page;
        var startDate;
        var endDate;
        var day;
        var month;
        var year;
        var match;
        var title;
        var i;

        var channelsPerPage = 10;
        var messagesPerPage = 300;

        sync(function() {
            if (!req.params.channel) {
                channels = app.Channel.find.sync(app.Channel, { 'private': false }, ['name', 'url'], { skip: 0, limit: channelsPerPage });
            } else if (req.params.channel === 'p' && req.params.monthyear && app.set('helpers').utils.isInt(req.params.monthyear)) {
                channels = app.Channel.find.sync(app.Channel, { 'private': false }, ['name', 'url'], { skip: req.params.monthyear * channelsPerPage, limit: channelsPerPage });
            }

            if (channels && channels.length > 0) {
                title = 'Архив';

                if (channels.length > channelsPerPage) {
                    pages = Math.floor(app.Channel.count.sync(app.Channel, { 'private': false }) / channelsPerPage);
                }

                var countedChannels = [];

                for (i = 0; i < channels.length; i++) {
                    countedChannels.push({
                        count  : app.Message.count.sync(app.Message, { channelId: channels[i].id }),
                        channel: channels[i]
                    });
                }

                page = req.params.monthyear || 0;

                return {
                    type: 'channels',
                    data: {
                        prev    : (page - 1) < 0 ? null : (page - 1),
                        next    : (page + 1) >= (pages || 0) ? null : (page + 1),
                        channels: countedChannels
                    }
                };
            }

            channel = app.Channel.findOne.sync(app.Channel, { 'url': req.params.channel, 'private': false }, ['name', 'url']);
            if (!channel) return;

            title = 'Архив / ' + channel.name;

            if (req.params.channel !== 'p' && !req.params.monthyear) {
                function reduceMonthYear (key, values) {
                    var result = { count: 0 };

                    values.forEach(function(value) {
                        result.count += value.count;
                    });

                    return result;
                }

                function mapMonthYear () {
                    var msgDate = new Date(this.time);
                    emit((msgDate.getMonth() + 1) + '-' + msgDate.getFullYear(), { count: 1 });
                }

                app.Message.db.db.executeDbCommand.sync(app.Message.db.db, {
                    mapreduce: 'messages',
                    map      : mapMonthYear.toString(),
                    reduce   : reduceMonthYear.toString(),
                    query    : { channelId: channel._id },
                    out      : 'archiveMonthYear'
                });

                collection = app.Message.db.db.collection.sync(app.Message.db.db, 'archiveMonthYear');
                docs = collection.find.sync(collection, {});
                docs = docs.toArray.sync(docs);

                for (i = 0; i < docs.length;i++) {
                    docs[i]._id = moment(docs[i]._id, 'MM-YY').format('MMMM YYYY');
                }

                return {
                    type: 'years',
                    data: {
                        dates: docs,
                        channel: channel
                    }
                };
            }

            if (req.params.channel !== 'p' && req.params.monthyear && !req.params.day) {
                match = req.params.monthyear.match(/^(\d{2})-(\d{4})$/);
                month = parseInt(match[1]) - 1;
                year = match[2];

                if (!month || !year) return;

                startDate = app.set('helpers').utils.getUTCDate(moment(new Date(year, month, 1, 0, 0, 0))['native']());
                endDate = app.set('helpers').utils.getUTCDate(moment(new Date(year, month, 1, 0, 0, 0)).add('months', 1)['native']());

                function reduceMonthYearDay (key, values) {
                    var result = { count: 0 };

                    values.forEach(function(value) {
                        result.count += value.count;
                    });

                    return result;
                }

                function mapMonthYearDay () {
                    var msgDate = new Date(this.time);
                    emit(msgDate.getDate() + '-' + (msgDate.getMonth() + 1) + '-' + msgDate.getFullYear(), { count: 1 });
                }

                app.Message.db.db.executeDbCommand.sync(app.Message.db.db, {
                    mapreduce: 'messages',
                    map      : mapMonthYearDay.toString(),
                    reduce   : reduceMonthYearDay.toString(),
                    query    : {
                        channelId: channel._id,
                        time     : {
                            $gte: startDate,
                            $lt : endDate
                        }
                    },
                    out      : { replace: 'archiveMonthYearDay' }
                });

                collection = app.Message.db.db.collection.sync(app.Message.db.db, 'archiveMonthYearDay');
                docs = collection.find.sync(collection, {});

                return {
                    type: 'days',
                    data: docs.toArray.sync(docs)
                };
            }

            if (req.params.channel !== 'p' && req.params.monthyear && req.params.day) {
                match = req.params.monthyear.match(/^(\d{2})-(\d{4})$/);
                month = parseInt(match[1]) - 1;
                year = match[2];

                if (!month || !year) return;

                startDate = app.set('helpers').utils.getUTCDate(moment(new Date(year, month, req.params.day, 0, 0, 0))['native']());
                endDate = app.set('helpers').utils.getUTCDate(moment(new Date(year, month, req.params.day, 0, 0, 0)).add('days', 1)['native']());

                page = req.params.page || 0;
                pages = Math.floor(app.Message.count.sync(app.Message, {
                    channelId: channel.id,
                    time     : {
                        $gte: startDate,
                        $lt : endDate
                    }
                } || 0) / messagesPerPage);

                var messages = app.Message.find.sync(app.Message, {
                    channelId: channel._id,
                    time     : {
                        $gte: startDate,
                        $lt : endDate
                    }
                }, ['time', 'text', 'userId'], { skip: page * messagesPerPage, limit: messagesPerPage });

                var userIds = [];
                var usersArray = [];

                for (i = 0; i < messages.length; i++) {
                    userIds.push(messages[i].userId);
                }

                var users = app.User.find.sync(app.User, { _id: { $in: userIds } }, ['name']);

                for (i = 0; i < users.length; i++) {
                    usersArray[users[i].id] = users[i].name;
                }

                return {
                    type: 'messages',
                    data: {
                        prev    : (page - 1) < 0 ? null : (page - 1),
                        next    : (page + 1) >= pages ? null : (page + 1),
                        messages: messages,
                        users   : usersArray
                    }
                };
            }

        }, function(err, result) {
            if (err) {
                app.set('log').error(err.stack);
                return res.send(500);
            }

            if (!result) res.send(404);

            console.log(result.data);

            res.render(req.mobile ? 'mobile/archive/' + result.type : 'web/archive/' + result.type, {
                title: title,
                data : result.data
            });
        });
    }
};