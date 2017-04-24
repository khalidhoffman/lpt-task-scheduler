const Sequelize = require('sequelize');
const shortid = require('shortid');
const request = require('superagent');
const moment = require('moment');
const sequelize = require('../services/sequelize');


const modelAttrs = {
    taskNumId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        autoIncrement: true,
        primaryKey: true
    },
    taskId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
    state: Sequelize.TEXT,
    startTimestamp: Sequelize.DATE,
    payload: Sequelize.TEXT,
    name: Sequelize.STRING,
    callback: Sequelize.TEXT,
    callbackContentType: Sequelize.STRING,
    callbackMethod: Sequelize.STRING(5),

};

const modelMethods = {
    instanceMethods: {
        start: function () {
            let _timeoutId;
            let callback;

            const waitDuration = moment(this.startTimestamp).diff(moment());
            const taskUpdates = {
                id: shortid.generate(),
                state: 'waiting'
            };

            const beforeStart = () => {
                return this.update({state: 'executing'})
            };

            const onDone = () => {
                callback();
                return this.update({state: 'done'})
                    .then(() => {
                        return Promise.resolve()
                    })
            };
            const onFailure = (err) => {
                callback(err);
                return this.update({state: `errored - ${err.toString()}`})
                    .then(() => {
                        return Promise.reject(err)
                    })
            };


            const task = new Promise((resolve, reject) => {
                // wizardry. sorry bout it;
                callback = resolve;
            });

            _timeoutId = setTimeout(() => {
                beforeStart()
                    .then(() => {
                        return request[this.callbackMethod](this.callback)
                            .type(this.callbackContentType)
                            .send(this.payload)
                    })
                    .then(onDone)
                    .catch(onFailure)

            }, waitDuration);

            return {
                model: this,
                updates: taskUpdates,
                _promise: task,
                _timeoutId
            }
        }
    }
};
const Tasks = sequelize.define('tasks', modelAttrs, modelMethods);

sequelize.sync()
    .catch((err) => {
        console.error(`MySQL db initialization err:\n${err}`);
    });

module.exports = Tasks;