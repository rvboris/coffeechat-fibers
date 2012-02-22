var sync   = require('sync');
var moment = require('moment');

module.exports = function(app) {
    moment.lang('ru');

    return function(req, res) {
        var channelsPerPage = 30;
        var messagesPerPage = 300;
        var channels;
        var countedChannels = [];
        var channel;
        var title;
        var pages;
        var page;
        var collection;
        var docs;
        var match;
        var year;
        var month;
        var startDate;
        var endDate;
        var formatDate;
        var messages;
        var userIds;
        var users;
        var usersArray;
        var i;

        sync(function() {
            if (!req.params.channel) {
                channels = app.Channel.find.sync(app.Channel, { 'private': false }, ['name', 'url'], { skip: 0, limit: channelsPerPage });
            } else if (req.params.channel === 'p' && req.params.monthyear && app.set('helpers').utils.isInt(parseInt(req.params.monthyear))) {
                channels = app.Channel.find.sync(app.Channel, { 'private': false }, ['name', 'url'], { skip: req.params.monthyear * channelsPerPage, limit: channelsPerPage });
            }

            if (channels && channels.length > 0) {
                title = 'Архив';

                if (channels.length >= channelsPerPage) {
                    pages = Math.floor(app.Channel.count.sync(app.Channel, { 'private': false }) / channelsPerPage);
                }

                for (i = 0; i < channels.length; i++) {
                    messages = app.Message.count.sync(app.Message, { channelId: channels[i].id });
                    if (messages === 0) continue;
                    countedChannels.push({
                        count: messages,
                        channel: channels[i]
                    });
                }

                page = req.params.monthyear || 0;

                return {
                    type: 'channels',
                    data: {
                        page: page,
                        prev: (page - 1) < 0 ? null : (page - 1),
                        next: (page + 1) > (pages || 0) ? null : (page + 1),
                        channels: countedChannels
                    }
                };
            }

            channel = app.Channel.findOne.sync(app.Channel, { 'url': req.params.channel, 'private': false }, ['name', 'url']);
            if (!channel) return;

            title = 'Архив - ' + channel.name;

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
                    map: mapMonthYear.toString(),
                    reduce: reduceMonthYear.toString(),
                    query: { channelId: channel._id },
                    out: 'archiveMonthYear'
                });

                collection = app.Message.db.db.collection.sync(app.Message.db.db, 'archiveMonthYear');
                docs = collection.find.sync(collection, {});
                docs = docs.toArray.sync(docs);

                for (i = 0; i < docs.length; i++) {
                    formatDate = moment(docs[i]._id, 'MM-YYYY');
                    docs[i]._id = formatDate.format('MM-YYYY');
                    docs[i].month = formatDate.format('MMMM');
                    docs[i].year = formatDate.format('YYYY');
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

                if (match === null) return;

                month = (parseInt(match[1]) - 1).toString();
                year = match[2];

                if (!month || !year) return;

                startDate = moment(new Date(year, month, 1, 0, 0, 0))['native']();
                endDate = moment(new Date(year, month, 1, 0, 0, 0)).add('months', 1)['native']();

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
                    map: mapMonthYearDay.toString(),
                    reduce: reduceMonthYearDay.toString(),
                    query: {
                        channelId: channel._id,
                        time: {
                            $gte: startDate,
                            $lt: endDate
                        }
                    },
                    out: { replace: 'archiveMonthYearDay' }
                });

                collection = app.Message.db.db.collection.sync(app.Message.db.db, 'archiveMonthYearDay');
                docs = collection.find.sync(collection, {});
                docs = docs.toArray.sync(docs);

                for (i = 0; i < docs.length; i++) {
                    formatDate = moment(docs[i]._id, 'DD-MM-YYYY');
                    docs[i]._id = formatDate.format('MM-YYYY');
                    docs[i].dayOfWeek = formatDate.format('ddd');
                    docs[i].day = formatDate.format('DD');
                    docs[i].month = formatDate.format('MMMM');
                    docs[i].year = formatDate.format('YYYY');
                }

                return {
                    type: 'days',
                    data: {
                        dates: docs,
                        channel: channel
                    }
                };
            }

            if (req.params.channel !== 'p' && req.params.monthyear && req.params.day) {
                match = req.params.monthyear.match(/^(\d{2})-(\d{4})$/);

                if (match === null) return;

                month = (parseInt(match[1]) - 1).toString();
                year = match[2];

                if (!month || !year) return;

                startDate = moment(new Date(year, month, req.params.day, 0, 0, 0))['native']();
                endDate = moment(new Date(year, month, req.params.day, 0, 0, 0)).add('days', 1)['native']();

                page = req.params.page || 0;
                pages = Math.floor(app.Message.count.sync(app.Message, {
                    channelId: channel.id,
                    time: {
                        $gte: startDate,
                        $lt: endDate
                    }
                } || 0) / messagesPerPage);

                messages = app.Message.find.sync(app.Message, {
                    channelId: channel._id,
                    time: {
                        $gte: startDate,
                        $lt: endDate
                    }
                }, ['time', 'text', 'userId'], { skip: page * messagesPerPage, limit: messagesPerPage });

                userIds = [];
                usersArray = [];

                for (i = 0; i < messages.length; i++) {
                    userIds.push(messages[i].userId);
                    messages[i].timeString = moment(new Date(messages[i].time)).format('HH:mm:ss');
                }

                users = app.User.find.sync(app.User, { _id: { $in: userIds } }, ['name']);

                for (i = 0; i < users.length; i++) {
                    usersArray[users[i].id] = users[i].name;
                }

                return {
                    type: 'messages',
                    data: {
                        date: moment(startDate).format('DD.MM.YYYY'),
                        dateUrl1: moment(startDate).format('MM-YYYY'),
                        dateUrl2: moment(startDate).format('DD'),
                        page: page,
                        prev: (page - 1) < 0 ? null : (page - 1),
                        next: (page + 1) > pages ? null : (page + 1),
                        messages: messages,
                        users: usersArray,
                        channel: channel
                    }
                };
            }
        }, function(err, result) {
            if (err) {
                app.set('log').error(err.stack);
                return res.send(500);
            }

            if (!result) res.send(404);

            try {
                res.render((req.mobile ? 'mobile' : 'web') + '/archive/' + result.type, {
                    title: title,
                    data: result.data,
                    env: app.set('argv').env,
                    layout: (req.mobile ? 'mobile' : 'web') + '/archive/layout'
                });
            } catch (e) {
                app.set('log').error(err.stack);
                res.send(500);
            }
        });
    }
};