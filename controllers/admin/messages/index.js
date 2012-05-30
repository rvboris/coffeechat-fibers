var sync   = require('sync');
var nconf  = require('nconf');
var aes    = require('../../../helpers/aes.js');
var moment = require('moment');

module.exports = function (app) {
    nconf.use('file', { file: __dirname + '/../../../config/' + app.set('argv').env + '.json' });

    var messagesPerPage = nconf.get('admin').messagesPerPage;

    return function (req, res) {
        sync(function () {
            var params = {
                query: req.params.text || '*',
                page: parseInt(req.params.page || 0)
            };

            var messages = { objects: [], count: 0 };
            var channels = { objects: [], array: [], ids: [] };
            var users = { objects: [], array: [], ids: [] };
            var elastic = { docs: [], highlighted: [] };
            var i, query, pages;

            if (params.query === '*') {
                messages.count = app.Message.count.sync(app.Message);
            } else {
                messages.count = app.set('helpers').elastic.sync(app.set('helpers'), 'count', nconf.get('elasticsearch').index, 'message', 'text:' + params.query);
            }

            if (messages.count > 0) {
                pages = Math.ceil(messages.count / messagesPerPage);

                if (params.query === '*') {
                    query = app.Message.find({}).skip(params.page * messagesPerPage).limit(messagesPerPage).sort('time', -1);
                    messages.objects = query.execFind.sync(query);

                    for (i = 0; i < messages.objects.length; i++) {
                        users.ids.push(messages.objects[i].userId);
                        channels.ids.push(messages.objects[i].channelId);
                    }
                } else {
                    elastic.docs = app.set('helpers').elastic.sync(app.set('helpers'), 'search', nconf.get('elasticsearch').index, 'message', {
                        query: {
                            queryString: {
                                query: 'text:' + params.query,
                                analyze_wildcard: true
                            }
                        },
                        highlight: {
                            fields: {
                                text: {
                                    number_of_fragments: 0
                                }
                            }
                        },
                        from: params.page * messagesPerPage,
                        size: messagesPerPage
                    });

                    messages.ids = elastic.docs.map(function (doc) {
                        elastic.highlighted[doc._id] = doc.highlight.text[0];
                        users.ids.push(doc._source.userId);
                        return doc._id
                    });

                    query = app.Message.find({ _id: { $in: messages.ids } }, ['_id', 'channelId', 'time'])
                        .skip(params.page * messagesPerPage)
                        .limit(messagesPerPage)
                        .sort('time', -1);

                    messages.objects = query.execFind.sync(query);

                    for (i = 0; i < messages.objects.length; i++) {
                        channels.ids.push(messages.objects[i].channelId);
                        messages.objects[i].text = elastic.highlighted[messages.objects[i]._id];
                    }
                }

                users.objects = app.User.find.sync(app.User, { _id: { $in: users.ids, $nin: app.set('systemUserIds') } }, ['name']);
                channels.objects = app.Channel.find.sync(app.Channel, { _id: { $in: channels.ids } }, ['name']);

                for (i = 0; i < users.objects.length; i++) users.array[users.objects[i].id] = users.objects[i].name;
                for (i = 0; i < channels.objects.length; i++) channels.array[channels.objects[i].id] = channels.objects[i].name;
            }

            delete channels.objects;
            delete channels.ids;
            channels = channels.array;

            delete users.objects;
            delete users.ids;
            users = users.array;

            delete elastic.docs;
            delete elastic.highlighted;

            var messagesCount = messages.count;

            delete messages.count;
            messages = messages.objects;

            res.render('admin/messages', {
                env: app.set('argv').env,
                csrf: req.session._csrf,
                layout: 'admin/layout',
                logServer: app.set('argv').logserver,
                secretKey: app.set('helpers').utils.base64.encode(aes.enc(req.session.user.id, app.set('serverKey'))),
                section: 'messages',
                users: users,
                channels: channels,
                messages: messages,
                messagesCount: messagesCount,
                query: params.query,
                moment: moment,
                pagination: {
                    pages: pages,
                    currentPage: params.page,
                    isFirstPage: params.page === 0,
                    isLastPage: params.page === (pages - 1)
                }
            });
        }, function (err) {
            if (!err) return;

            app.set('log').error(err.stack);
            res.send(500);
        });
    };
};