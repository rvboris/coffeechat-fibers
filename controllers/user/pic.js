var formidable = require('formidable');
var fs         = require('fs');
var path       = require('path');
var sync       = require('sync');
var aes        = require('../../helpers/aes.js');

module.exports = function(app) {
    var uploadPath = path.normalize(__dirname + '/../../public/userpics');

    if (!path.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, 0x1ff);
    }

    return function(req, res) {
        var form = new formidable.IncomingForm();
        var userpic;

        // params
        form.uploadDir = uploadPath;
        form.keepExtensions = true;
        form.maxFieldsSize = 10240;

        // events
        form.on('progress', function(bytesReceived, bytesExpected) {
            app.set('log').debug('userpic upload progress: %s/%s', bytesReceived / 1024, bytesExpected / 1024);
        });

        form.on('error', function(err) {
            app.set('log').debug(err);
            res.send(500);
        });

        form.on('aborted', function() {
            app.set('log').debug('upload aborted');
            res.send(500);
        });

        form.on('file', function(name, file) {
            app.set('log').debug('file %s received', file.filename);
            userpic = path.basename(file.path);
            sync(function() {
                var user = app.User.findById.sync(app.User, aes.dec(req.params.key, app.set('serverKey')));
                if (!user) throw new Error('user not found');
                user.pic = userpic;
                return user.save.sync(user);
            }, function(err, user) {
                if (err) {
                    app.set('log').error(err.stack);
                    return res.send(500);
                }
                if (!user) {
                    app.set('log').error(new Error('user not found'));
                    return res.send(500);
                }
                app.set('log').debug('userpic path saved "%s"', user.pic);
            });
        });

        form.on('end', function() {
            if (userpic && userpic.length > 0) {
                app.set('log').debug('userpic upload ok');
                res.send({ pic: userpic });
            } else {
                res.send({ error: 'Ошибка загрузки' });
            }
        });

        form.parse(req);
    };
};