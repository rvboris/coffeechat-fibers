module.exports = function(app, task) {
    var run = false;
    var cycle;

    return {
        task : task,
        start: function(recipient) {
            if (run) return;
            run = true;

            app.set('log').debug('process "' + this.task.name + '" start');

            var args = Array.prototype.slice.call(arguments);

            args.push((function(self) {
                return function() {
                    clearInterval(cycle);
                    run = false;
                    app.set('log').debug('process "' + self.task.name + '" stop');
                };
            })(this), this.task.interval);

            cycle = setInterval((function(self) {
                return function() {
                    self.task.callback.apply(self, args);
                };
            })(this), this.task.interval * 1000);
        }
    };
};