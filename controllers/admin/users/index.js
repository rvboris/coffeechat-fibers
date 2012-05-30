var sync   = require('sync');
var nconf  = require('nconf');
var aes    = require('../../../helpers/aes.js');
var moment = require('moment');

module.exports = function (app) {
    nconf.use('file', { file:__dirname + '/../../../config/' + app.set('argv').env + '.json' });

    var usersPerPage = nconf.get('admin').usersPerPage;

    return function (req, res) {
        sync(function () {
            var name = req.params.name || '*';
            var page = parseInt(req.params.page || 0);
            var usersCount;
            var pages = 0;
            var users = [];
            var messages = [];
            var query;

            if (name === '*') {
                usersCount = app.User.count.sync(app.User);
            } else {
                usersCount = app.User.count.sync(app.User, { name:{ $regex:name } });
            }

            if (usersCount > 0) {
                pages = Math.ceil(usersCount / usersPerPage);

                if (name === '*') {
                    query = app.User.find({}, ['_id', 'role', 'name', 'date', 'stats']);
                } else {
                    query = app.User.find({ name: { $regex: name } }, ['_id', 'role', 'name', 'date', 'stats']);
                }

                users = query.skip(page * usersPerPage).limit(usersPerPage).sort('date', -1).execFind.sync(query);

                for (var i = 0; i < users.length; i++) {
                    messages[users[i].id] = app.Message.count.sync(app.Message, { userId:users[i].id });
                }
            }

            res.render('admin/users', {
                env:app.set('argv').env,
                csrf:req.session._csrf,
                layout:'admin/layout',
                logServer:app.set('argv').logserver,
                secretKey:app.set('helpers').utils.base64.encode(aes.enc(req.session.user.id, app.set('serverKey'))),
                section:'users',
                users:users,
                usersCount: usersCount,
                messages:messages,
                query:name,
                moment:moment,
                pagination:{
                    pages:pages,
                    currentPage:page,
                    isFirstPage:page === 0,
                    isLastPage:page === (pages - 1)
                }
            });
        }, function (err) {
            if (!err) return;

            app.set('log').error(err.stack);
            res.send(500);
        });
    };
};