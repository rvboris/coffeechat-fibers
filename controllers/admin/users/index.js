var sync   = require('sync');
var nconf  = require('nconf');
var aes    = require('../../../helpers/aes.js');
var moment = require('moment');

module.exports = function (app) {
    nconf.use('file', { file:__dirname + '/../../../config/' + app.set('argv').env + '.json' });

    var usersPerPage = nconf.get('admin').usersPerPage;

    return function (req, res) {
        if (!req.haveAccess) return res.send(403);

        sync(function () {
            var name = req.params.name || '*';
            var page = parseInt(req.params.page || 0);
            var usersCount = (name === '*') ? app.User.count.sync(app.User) : app.User.count.sync(app.User, { name:{ $regex:name } });
            var pages = 0;
            var users;
            var messages = [];

            if (usersCount > 0) {
                pages = Math.ceil(usersCount / usersPerPage);
                var query;

                if (name === '*') {
                    query = app.User.find({}, ['_id', 'role', 'name', 'date', 'stats']).skip(page * usersPerPage).limit(usersPerPage);
                } else {
                    query = app.User.find({ name:{ $regex:name } }, ['_id', 'role', 'name', 'date', 'stats']).skip(page * usersPerPage).limit(usersPerPage);
                }

                users = query.execFind.sync(query);

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
                users:users || [],
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
            if (err) {
                app.set('log').error(err.stack);
                res.send(500);
            }
        });
    }
};