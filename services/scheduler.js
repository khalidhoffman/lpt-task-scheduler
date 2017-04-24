const moment = require('moment');
const _  = require('lodash');

const memoryCache = require('./memory-cache');
const Tasks = require('../models/task');

class Scheduler {

    /**
     *
     * @return {Promise}
     */
    update () {
        // set unassigned env variables
        if (!process.env.SCHEDULER_MAX) process.env.SCHEDULER_MAX = 5;
        if (!process.env.SCHEDULER_MAX_UNIT) process.env.SCHEDULER_MAX_UNIT = 'minute';

        const taskParams = {
            where: {
                state: 'uninitialized',
                startTimestamp: {
                    $lte: moment().add(process.env.SCHEDULER_MAX, process.env.SCHEDULER_MAX_UNIT).toDate()
                }
            }
        };

        return Tasks.findAll(taskParams)
            .then((tasks) => {
                // task.init() is  a member function we defined in the task model
                // it returns a an object containing everything you could ever want to know about a timeout
                const taskMetas =  _.map(tasks, (task) => {
                    return task.start()
                });

                taskMetas.forEach(taskMeta => {
                    memoryCache.set(taskMeta.model.dataValues.taskId, taskMeta);
                });

                return Promise.resolve({
                    count: taskMetas.length,
                    tasks: taskMetas.map(taskMeta => taskMeta.model.dataValues)
                })
            })
            .catch((err) => {
                console.error(err);
                return Promise.reject(err);
            });
    }
}

module.exports = new Scheduler();