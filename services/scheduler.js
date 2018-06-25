const moment = require('moment');

const memoryCache = require('./memory-cache');
const Tasks = require('../models/task');

class Scheduler {

    /**
     *
     * @param {Object} [options]
     * @param {string} [options.schedulerMaxLookAhead=5]
     * @param {number} [options.schedulerMaxLookAheadUnit='minute']
     * @param {MemoryCache} [options.memoryCache]
     */
    constructor(options) {
        this.opts = Object.assign({
            schedulerMaxLookAhead: Number(process.env.SCHEDULER_MAX || 5),
            schedulerMaxLookAheadUnit: process.env.SCHEDULER_MAX_UNIT || 'minute',
            memoryCache
        }, options);
    }

    /**
     * @private
     * @return {Date}
     */
    getMaxStartTimestamp() {
        return moment().add(this.opts.schedulerMaxLookAhead, this.opts.schedulerMaxLookAheadUnit).toDate()
    }

    /**
     *
     * @param {Sequelize.Transaction} [transaction]
     * @return {Promise}
     */
    update(transaction) {
        return Tasks.findAll({
                where: {
                    state: 'uninitialized',
                    startTimestamp: {
                        $lte: this.getMaxStartTimestamp()
                    }
                },
                transaction
            })
            .then((tasks) => {
                const taskRefs = tasks.map(task => task.start());

                taskRefs.forEach(taskMeta => this.opts.memoryCache.set(taskMeta.model.taskId, taskMeta));

                return Promise.resolve(taskRefs.map(taskRef => taskRef.model.toJSON()));
            })
            .catch((err) => {
                console.error(err);
                return Promise.reject(err);
            });
    }
}

module.exports = new Scheduler();