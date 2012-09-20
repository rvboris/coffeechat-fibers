var sync   = require('sync');
var nconf  = require('nconf');
var aes    = require('../../../helpers/aes.js');
var moment = require('moment');

module.exports = function (app) {
    nconf.use('file', { file: __dirname + '/../../../config/' + app.set('argv').env + '.json' });

    var channelsPerPage = nconf.get('admin').channelsPerPage;

    return function (req, res) {
        sync(function () {
            var channel = req.params.channel || '*';
            var page = parseInt(req.params.page || 0);
            var channelsCount;
            var pages = 0;
            var channels = [];
            var messages = [];
            var owners = [];
            var query;

            if (channel === '*') {
                channelsCount = app.Channel.count.sync(app.Channel);
            } else {
                channelsCount = app.Channel.count.sync(app.Channel, { name: { $regex: channel } });
            }

            if (channelsCount > 0) {
                pages = Math.ceil(channelsCount / channelsPerPage);

                if (channel === '*') {
                    query = app.Channel.find({}, '_id name owner date lastaccess hidden password private url');
                } else {
                    query = app.Channel.find({ name: { $regex: channel } }, '_id name owner date lastaccess hidden password private url');
                }

                channels = query.skip(page * channelsPerPage).limit(channelsPerPage).sort('-date').execFind.sync(query);

                for (var i = 0; i < channels.length; i++) {
                    messages[channels[i].id] = app.Message.count.sync(app.Message, { channelId: channels[i].id });
                    owners[channels[i].id] = {
                        name: app.User.findById.sync(app.User, channels[i].owner.toHexString(), 'name').name
                    };
                    channels[i].password = channels[i].password ? true : false;
                    channels[i].system = app.set('channels')[channels[i].url];
                }
            }

            res.render('admin/channels', {
                env: app.set('argv').env,
                csrf: req.session._csrf,
                layout: 'admin/layout',
                logServer: app.set('argv').logserver,
                secretKey: app.set('helpers').utils.base64.encode(aes.enc(req.session.user.id, app.set('serverKey'))),
                section: 'channels',
                channels: channels,
                channelsCount: channelsCount,
                messages: messages,
                owners: owners,
                query: channel,
                moment: moment,
                pagination: {
                    pages: pages,
                    currentPage: page,
                    isFirstPage: page === 0,
                    isLastPage: page === (pages - 1)
                }
            });
        }, function (err) {
            if (!err) return;

            app.set('log').error(err.stack);
            res.send(500);
        });
    };
};