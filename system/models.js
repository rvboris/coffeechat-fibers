var crypto    = require('crypto');
var filter    = require('validator').sanitize;
var Validator = require('validator').Validator;

exports.define = function (app, mongoose, callback) {
    var schema = mongoose.Schema;
    var objectId = schema.ObjectId;
    var vdr = new Validator();

    var regexp = {
        url: /([a-zA-Z]+):\/\/([^:\/?#\s]+)+(:\d+)?(\/[^?#\s]+)?(\?[^#\s]+)?(#[^\s]+)?/,
        alphabet: /^[А-Яа-яЁёA-Za-z0-9\s]+$/
    };

    var validators = {
        isValidName: function (name) {
            try {
                vdr.check(name).len(3, 15).regex(regexp.alphabet);
            } catch (e) {
                return false;
            }
            return true;
        },
        isValidPassword: function (password) {
            try {
                vdr.check(password).len(6, 30);
            } catch (e) {
                if (password.match(/@h$/) < 0) return false;
            }
            return true;
        },
        isValidEmail: function (email) {
            try {
                vdr.check(email).len(6, 64).isEmail();
            } catch (e) {
                return false;
            }
            return true;
        },
        isValidMessage: function (message) {
            try {
                vdr.check(message).notEmpty();
            } catch (e) {
                return false;
            }
            return true;
        }
    };

    var setters = {
        stringSetter: function (value) {
            return filter(filter(value).trim()).xss();
        },
        md5Setter: function (value) {
            return crypto.createHash('md5').update(value).digest('hex');
        }
    };

    var defineUserModel = function () {
        var user = new schema({
            'name':     { 'type': String, 'index': true, 'required': true, 'unique': true, 'set': setters.stringSetter, 'validate': [validators.isValidName, 'invalid name'] },
            'password': { 'type': String, 'required': true, 'validate': [ validators.isValidPassword, 'invalid password'] },
            'role':     { 'type': String, 'default': 'U', 'enum': ['U', 'R', 'S'] }, // U - User, R - Root, S - System
            'salt':     { 'type': String, 'required': true },
            'email':    { 'type': String, 'set': setters.stringSetter, 'validate': [validators.isValidEmail, 'invalid email'] },
            'gender':   { 'type': String, 'default': 'N', 'enum': ['N', 'W', 'M'] }, // N - Neutral, W - Woman, M - Man
            'status':   { 'type': String, 'default': 'O', 'enum': ['O', 'F', 'A', 'U']}, // O - Online, F - Offline, A - Away, U - Unavailable
            'date':     { 'type': Date, 'default': new Date() },
            'pic':      { 'type': String },
            'points':   { 'type': Number, 'default': 0, 'min': 0 },
            'ignore': [String],
            'stats': {
                'fulltime':   { 'type': Number, 'default': 0, 'min': 0 },
                'lastaccess': { 'type': Date, 'default': new Date() }
            },
            'oauth': {
                'identity': { 'type': String, 'set': setters.md5Setter },
                'provider': { 'type': String, 'set': setters.md5Setter }
            },
            'settings': {
                audio: {
                    'onMessage': { 'type': Boolean, 'default': true  },
                    'onMention': { 'type': Boolean, 'default': false },
                    'onPrivate': { 'type': Boolean, 'default': true  },
                    'onEnter':   { 'type': Boolean, 'default': true  },
                    'onExit':    { 'type': Boolean, 'default': false },
                    'whenAway':  { 'type': Boolean, 'default': false },
                    'whenUnavailable': { 'type': Boolean, 'default': false }
                },
                'interface': {
                    'flashTabOnMessage': { 'type': Boolean, 'default': true },
                    'flashTabOnMention': { 'type': Boolean, 'default': true },
                    'chatNotifications': { 'type': Boolean, 'default': true }
                }
            }
        });

        user.virtual('id').get(function () {
            return this._id.toHexString();
        });

        user.virtual('secret').set(function (password) {
            this.set('password', password);
            this.set('salt', this.makeSalt());
        });

        user.method('isSystem', function () {
            return app.set('systemUserIds').indexOf(this.id) >= 0 || this.role === 'R' || this.role === 'S';
        });

        user.method('authenticate', function (txt) {
            return txt.length > 30 ? false : this.encryptPassword(txt) === this.password;
        });

        user.method('makeSalt', function () {
            return Math.round((new Date().valueOf() * Math.random())) + '';
        });

        user.method('encryptPassword', function (password) {
            return crypto.createHmac('sha512', this.salt).update(password).digest('hex') + '@h';
        });

        user.pre('save', function (next) {
            if (this.password.length < 30 && this.password.length > 5)
                this.password = this.encryptPassword(this.password);

            next();
        });

        app.set('log').debug('user model is loaded');

        return user;
    };

    var defineChannelModel = function () {
        var channel = new schema({
            'name':    { 'type': String, 'required': true, 'unique': true },
            'url':     { 'type': String, 'required': true, 'unique': true },
            'private': { 'type': Boolean, 'default': false },
            'owner':   { 'type': objectId, 'required': true },
            'date':    { 'type': Date, 'default': new Date() }
        });

        channel.statics.params = {};

        channel.virtual('id').get(function () {
            return this._id.toHexString();
        });

        app.set('log').debug('channel model is loaded');

        return channel;
    };

    var defineChannelBanModel = function () {
        var channelBan = new schema({
            'userId':    { 'type': objectId, 'required': true },
            'userIp':    { 'type': String, required: false },
            'channelId': { 'type': objectId, 'required': true },
            'date':      { 'type': Date, 'default': new Date() }
        });

        app.set('log').debug('channel ban model is loaded');

        return channelBan;
    };

    var defineMessageModel = function () {
        var message = new schema({
            'userId':    { 'type': objectId, 'required': true },
            'channelId': { 'type': objectId, 'index': true, 'required': true },
            'time':      { 'type': Date, 'required': true },
            'text':      { 'type': String, 'required': true, 'validate': [validators.isValidMessage, 'invalid message']}
        });

        message.virtual('id').get(function () {
            return this._id.toHexString();
        });

        message.virtual('txt').set(function (text) {
            this.text = text;
            this.parsed = text;
        });

        message.method('parseLinks', function (text) {
            return text.replace(regexp.url, '<a href="$&" class="userLink" target="_blank">$&</a>');
        });

        message.method('parseText', function (text) {
            text = filter(text).entityEncode();
            text = this.parseLinks(text);
            return text;
        });

        message.method('formatTo', function (to) {
            var html = '→ (';
            for (var k in to) html += '<button class=\'name\'>' + to[k] + ((k == to.length - 1) ? '</button>' : '</button>, ');
            return html += ') ';
        });

        message.pre('save', function (next) {
            if (this.parsed !== this.text)
                this.text = (typeof this.to != 'undefined') ? (this.to + this.parsed) : this.parsed;
            else if (this.to)
                this.text = this.to + this.text;
            next();
        });

        app.set('log').debug('message model is loaded');

        return message;
    };

    var defineSubscriptionModel = function () {
        var subscription = new schema({
            'userId':    { 'type': objectId, 'required': true, 'index': true },
            'channelId': { 'type': objectId, 'required': true, 'index': true },
            'role':      { 'type': String, 'default': 'U', 'enum': ['U', 'A', 'M'] }, // U - User, A - Author, M - Moderator
            'time':      { 'type': Date, 'required': true, 'index': true }
        });

        subscription.virtual('id').get(function () {
            return this._id.toHexString();
        });

        app.set('log').debug('subscription model is loaded');

        return subscription;
    };

    var definePasswordRecoveryModel = function () {
        var passwordRecovery = new schema({
            'userId': { 'type': objectId, 'required': true },
            'key':    { 'type': String, 'requred': true },
            'time':   { 'type': Date, 'required': true, 'default': new Date() }
        });

        app.set('log').debug('password recovery model is loaded');

        return passwordRecovery;
    };

    mongoose.model('User', defineUserModel());
    mongoose.model('Channel', defineChannelModel());
    mongoose.model('Message', defineMessageModel());
    mongoose.model('Subscription', defineSubscriptionModel());
    mongoose.model('PasswordRecovery', definePasswordRecoveryModel());

    callback();
};

exports.removeCollections = function (mongoose, callback) {
    mongoose.model('User').collection.drop();
    mongoose.model('Channel').collection.drop();
    mongoose.model('Message').collection.drop();
    mongoose.model('Subscription').collection.drop();
    mongoose.model('PasswordRecovery').collection.drop();

    callback();
};
