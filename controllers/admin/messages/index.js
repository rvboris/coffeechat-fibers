var sync   = require('sync');
var nconf  = require('nconf');
var aes    = require('../../../helpers/aes.js');
var moment = require('moment');

module.exports = function(app) {
    var messagesPerPage = nconf.get('admin').messagesPerPage;

    function elasticSearchCount(query, callback) {
        app.set('esClient').count(nconf.get('elasticsearch').index, 'message', 'text:' + query)
            .on('data', function(data) {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    return callback(e);
                }

                callback(null, data.count);
            }).on('error', function(error) {
                callback(new Error(error.message));
            }).exec();
    }

    function elasticSearch(query, callback) {
        app.set('esClient').search(nconf.get('elasticsearch').index, 'message', {
            query: {
                queryString: { query: 'text:' + query }
            }
        }).on('data', function(data) {
            try {
                data = JSON.parse(data);
            } catch (e) {
                return callback(e);
            }

            if (data.hits.total === 0) return callback(null, []);

            for (var i = 0, messagesIds = []; i < data.hits.hits.length; i++) {
                messagesIds.push(data.hits.hits[i]._id);
            }

            callback(null, messagesIds);
        }).on('error', function(error) {
            callback(new Error(error.message));
        }).exec();
    }

    return function(req, res) {
        //if (!req.haveAccess) return res.send(403);

        sync(function() {
            var queryText = req.params.text || '*';
            var page = parseInt(req.params.page || 0);
            var messagesCount = (queryText === '*') ? app.Message.count.sync(app.Message) : elasticSearchCount.sync(this, queryText);
            var pages = 0;
            var messages;
            var channels;
            var users;
            var channelsArray = [];
            var usersArray = [];

            if (messagesCount > 0) {
                pages = Math.ceil(messagesCount / messagesPerPage);
                var query;

                if (queryText === '*') {
                    query = app.Message.find({}).skip(page * messagesPerPage).limit(messagesPerPage);
                } else {
                    console.log(elasticSearch.sync(this, queryText));
                    query = app.Message.find({ _id: { $in: elasticSearch.sync(this, queryText) } }).skip(page * messagesPerPage).limit(messagesPerPage);
                }

                messages = query.execFind.sync(query);

                for (var i = 0, usersIds = [], channelsIds = []; i < messages.length; i++) {
                    usersIds.push(messages[i].userId);
                    channelsIds.push(messages[i].channelId);
                }

                users = app.User.find.sync(app.User, { _id: { $in: usersIds, $nin: app.set('systemUserIds') } }, ['name']);
                channels = app.Channel.find.sync(app.Channel, { _id: { $in: channelsIds } }, ['name']);

                for (i = 0; i < users.length; i++) {
                    usersArray[users[i].id] = users[i].name;
                }

                for (i = 0; i < channels.length; i++) {
                    channelsArray[channels[i].id] = channels[i].name;
                }
            }

            console.log(elasticSearchCount.sync(this, queryText));
            console.log(elasticSearch.sync(this, queryText));

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