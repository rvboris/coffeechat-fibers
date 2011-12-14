var sync = require('sync');
var moment = require('moment');

module.exports = function (app) {
    return function (req, res) {
        var channels;
        var channel;
        var date;
        var pages;
        var page;
        var i;

        var channelsPerPage = 2;

        sync(function () {
            if (!req.params.channel) {
                channels = app.Channel.find.sync(app.Channel, { 'private':false }, ['name', 'url'], { skip:0, limit:channelsPerPage });
            } else if (req.params.channel === 'p' && req.params.year) {
                channels = app.Channel.find.sync(app.Channel, { 'private':false }, ['name', 'url'], { skip:req.params.year * channelsPerPage, limit:channelsPerPage });
            }

            if (channels && channels.length > 0) {
                if (channels.length > channelsPerPage) {
                    pages = Math.round(app.Channel.count.sync(app.Channel, { 'private':false }) / channelsPerPage)
                }

                var countedChannels = [];

                for (i = 0; i < channels.length; i++) {
                    countedChannels.push({
                        count  :app.Message.count.sync(app.Message, { channelId:channels[i].id }),
                        channel:channels[i]
                    });
                }

                return { pages:pages || 0, channels:countedChannels };
            }

            channel = app.Channel.findOne.sync(app.Channel, { 'url':req.params.channel, 'private':false }, ['name', 'url']);
            if (!channel) return;

            if (req.params.channel !== 'p' && !req.params.year) {
                function reduceYear(key, values) {
                    var result = { count:0 };

                    values.forEach(function (value) {
                        result.count += value.count;
                    });

                    return result;
                }

                function mapYear() {
                    emit(new Date(this.time).format('mm.yyyy'), { count:1 });
                }

                app.Message.db.db.executeDbCommand.sync(app.Message.db.db, {
                    mapreduce:'messages',
                    map      :mapYear.toString(),
                    reduce   :reduceYear.toString(),
                    query    :{ channelId:channel._id },
                    out      :{ replace:'' }
                });

                var collection = app.Message.db.db.collection.sync(app.Message.db.db, 'archiveYear');
                var docs = collection.find.sync(collection, {});
                return docs.toArray.sync(docs);
            }

            if (req.params.channel !== 'p' && req.params.year && !req.params.month) {
                /* /archive/xxx/2011 */

                date = moment(req.params.year);

                function reduceMonth(msg, out) {
                    if (out.months.indexOf(msg.time.getMonth()) > -1) return;
                    out.months.push(msg.time.getMonth());
                }

                return app.Message.db.executeDbCommand.sync(app.Message.db, {
                    'group':{
                        'ns'     :'message',
                        'cond'   :{
                            channelId:channel.id,
                            time     :{
                                $gte:date['native'](),
                                $lt :date.add('years', 1)['native']()
                            }
                        },
                        'initial':{'months':[]},
                        '$reduce':reduceMonth.toString(),
                        'key'    :{'time':1}
                    }
                });
            }

            if (req.params.channel !== 'p' && req.params.year && req.params.month && (!req.params.day || req.params.day === 'p')) {
                /* /archive/xxx/2011/12 */
                /* /archive/xxx/2011/12/p */
                /* /archive/xxx/2011/12/p/1 */

                page = req.params.page || 0;
                date = moment(req.params.year, req.params.month);
                return {
                    messages:app.Message.find.sync(app.Message, {
                        channelId:channel.id,
                        time     :{
                            $gte:date['native'](),
                            $lt :date.add('months', 1)['native']()
                        }
                    }, ['time'], { skip:page * 100, limit:100 })
                };
            }

            if (req.params.channel !== 'p' && req.params.year && req.params.month && req.params.day !== 'p') {
                /* /archive/xxx/2011/12/19 */
                /* /archive/xxx/2011/12/19/1 */

                page = req.params.page || 0;
                date = moment(req.params.year, req.params.month, req.params.day);
                return {
                    messages:app.Message.find.sync(app.Message, {
                        channelId:channel.id,
                        time     :{
                            $gte:date['native'](),
                            $lt :date.add('days', 1)['native']()
                        }
                    }, ['time'], { skip:page * 100, limit:100 })
                };
            }
        }, function (err, result) {
            if (err) {
                app.set('log').error(err.stack);
                return res.send(500);
            }
            if (result) {
                console.log(result);
            }
            res.send(404);
        });
    }
};