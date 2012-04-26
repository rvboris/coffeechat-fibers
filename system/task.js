module.exports = function (app, task) {
    var run = false;
    var cycle;

    return {
        task: task,
        getState: function () {
            return run;
        },
        start: function (recipient) {
            if (run) return;
            run = true;

            app.set('log').debug('process "%s" start', this.task.name);

            var args = Array.prototype.slice.call(arguments);

            args.push((function (self) {
                return function () {
                    clearInterval(cycle);
                    run = false;
                    app.set('log').debug('process "%s" stop', self.task.name);
                };
            })(this), this.task.interval);

            cycle = setInterval((function (self) {
                return function () {
                    self.task.callback.apply(self, args);
                };
            })(this), this.task.interval * 1000);
        }
    };
};