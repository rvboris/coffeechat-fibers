module.exports.getUTCDate = function(date) {
    var now = date || new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()));
};

module.exports.isInt = function(n) {
    return typeof n === 'number' && n % 1 === 0;
};

module.exports.getIp = function(req) {
    var ipAddress;
    var forwardedIpsStr = req.header('x-forwarded-for');

    if (forwardedIpsStr) {
        var forwardedIps = forwardedIpsStr.split(',');
        ipAddress = forwardedIps[0];
    }

    if (!ipAddress) {
        ipAddress = req.connection.remoteAddress;
    }

    return ipAddress;
};

module.exports.hook = function(obj) {
    if (obj.hook || obj.unhook) {
        throw new Error('Object already has properties hook and/or unhook');
    }

    obj.hook = function(methodName, fn, isAsync) {
        var self = this;
        var methodRef;

        if (!(Object.prototype.toString.call(self[methodName]) === '[object Function]')) {
            throw new Error('Invalid method: ' + methodName);
        }

        if (self.unhook.methods[methodName]) {
            throw new Error('Method already hooked: ' + methodName);
        }

        methodRef = (self.unhook.methods[methodName] = self[methodName]);

        self[methodName] = function() {
            var args = Array.prototype.slice.call(arguments);

            while (args.length < methodRef.length) {
                args.push(undefined);
            }

            args.push(function() {
                var args = arguments;

                if (isAsync) {
                    process.nextTick(function() {
                        methodRef.apply(self, args);
                    });
                } else {
                    methodRef.apply(self, args);
                }
            });

            fn.apply(self, args);
        };
    };

    obj.unhook = function(methodName) {
        var self = this,
            ref = self.unhook.methods[methodName];

        if (ref) {
            self[methodName] = self.unhook.methods[methodName];
            delete self.unhook.methods[methodName];
        } else {
            throw new Error('Method not hooked: ' + methodName);
        }
    };

    obj.unhook.methods = {};
};
