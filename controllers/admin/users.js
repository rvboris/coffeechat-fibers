var sync   = require('sync');
var nconf  = require('nconf');
var aes    = require('../../helpers/aes.js');
var moment = require('moment');

module.exports = function(app) {
    var usersPerPage = 3;

    return function(req, res) {
        sync(function() {
            var name = req.params.name || '*';
            var page = parseInt(req.params.page || 0);
            var usersCount = (name === '*') ? app.User.count.sync(app.User) : app.User.count.sync(app.User, { name: { $regex: name } });
            var pages;
            var users;

            if (usersCount === 0) {
                pages = 0;
                users = [];
            } else {
                pages = Math.ceil(usersCount / usersPerPage);
                var query;

                if (name === '*') {
                    query = app.User.find({}, ['_id', 'role', 'name', 'date', 'stats']).skip(page * usersPerPage).limit(usersPerPage);
                } else {
                    query = app.User.find({ name: { $regex: name } }, ['_id', 'role', 'name', 'date', 'stats']).skip(page * usersPerPage).limit(usersPerPage);
                }

                users = query.execFind.sync(query);
            }

            res.render('admin/users', {
                env: app.set('argv').env,
                csrf: req.session._csrf,
                layout: 'admin/layout',
                logServer: app.set('argv').logserver,
                secretKey: app.set('helpers').utils.base64.encode(aes.enc(req.session.user.id, app.set('serverKey'))),
                section: 'users',
                users: users,
                userName: name,
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