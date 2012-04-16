var sync   = require('sync');
var nconf  = require('nconf');
var aes    = require('../../../helpers/aes.js');
var moment = require('moment');
var qs     = require('querystring');

module.exports = function(app) {
    nconf.use('file', { file: __dirname + '/../../../config/' + app.set('argv').env + '.json' });

    var messagesPerPage = nconf.get('admin').messagesPerPage;

    return function(req, res) {
        if (!req.haveAccess) return res.send(403);

        sync(function() {
            var queryText = req.params.text || '*';
            var page = parseInt(req.params.page || 0);
            var messagesCount;
            var pages = 0;
            var messages;
            var channels;
            var users;
            var channelsArray = [];
            var usersArray = [];
            var usersIds = [];
            var channelsIds = [];
            var i;

            if (queryText === '*') {
                messagesCount = app.Message.count.sync(app.Message);
            } else {
                messagesCount = app.set('helpers').elastic.sync(app.set('helpers'), 'count', nconf.get('elasticsearch').index, 'message', qs.stringify({text: queryText}, ';', ':'));
            }

            if (messagesCount > 0) {
                pages = Math.ceil(messagesCount / messagesPerPage);
                var query;

                if (queryText === '*') {
                    query = app.Message.find({}).skip(page * messagesPerPage).limit(messagesPerPage);

                    messages = query.execFind.sync(query);

                    for (i = 0; i < messages.length; i++) {
                        usersIds.push(messages[i].userId);
                        channelsIds.push(messages[i].channelId);
                    }
                } else {
                    var findedDocs = app.set('helpers').elastic.sync(app.set('helpers'), 'search', nconf.get('elasticsearch').index, 'message', {
                        query:{
                            queryString:{ query:'text:' + queryText, analyze_wildcard:true }
                        },
                        highlight:{ fields:{ text:{} } },
                        from: page * messagesPerPage,
                        size: messagesPerPage
                    });

                    var highlightedTexts = [];

                    var messagesIds = findedDocs.map(function (doc) {
                        highlightedTexts[doc._id] = doc.highlight.text[0];
                        usersIds.push(doc._source.userId);
                        return doc._id
                    });

                    query = app.Message.find({ _id: { $in: messagesIds } }, ['_id', 'channelId', 'time']).skip(page * messagesPerPage).limit(messagesPerPage);
                    messages = query.execFind.sync(query);

                    for (i = 0; i < messages.length; i++) {
                        channelsIds.push(messages[i].channelId);
                        messages[i].text = highlightedTexts[messages[i]._id];
                    }
                }

                users = app.User.find.sync(app.User, { _id: { $in: usersIds, $nin: app.set('systemUserIds') } }, ['name']);
                channels = app.Channel.find.sync(app.Channel, { _id: { $in: channelsIds } }, ['name']);

                for (i = 0; i < users.length; i++) usersArray[users[i].id] = users[i].name;
                for (i = 0; i < channels.length; i++) channelsArray[channels[i].id] = channels[i].name;
            }

            res.render('admin/messages', {
                env: app.set('argv').env,
                csrf: req.session._csrf,
                layout: 'admin/layout',
                logServer: app.set('argv').logserver,
                secretKey: app.set('helpers').utils.base64.encode(aes.enc(req.session.user.id, app.set('serverKey'))),
                section: 'messages',
                users: usersArray,
                channels: channelsArray,
                messages: messages || [],
                query: queryText,
                moment: moment,
                pagination: {
                    pages: pages,
                    currentPage: page,
                    isFirstPage: page === 0,
                    isLastPage: page === (pages - 1)
                }
            });
        }, function(err) {
            if (err) {
                app.set('log').error(err.stack);
                res.send(500);
            }
        });
    }
};