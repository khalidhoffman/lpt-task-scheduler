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
        /**
         * @desc task.start() is  a member function we defined in the task model
         * @return {{model: modelMethods, _promise: Promise<any>, _timeoutId: number | Object | *}} - an object containing everything you could ever want to know about a timeout
         */
        start: function () {
            let _timeoutId;
            let _callback;

            const waitDuration = moment(this.startTimestamp).diff(moment());

            const beforeStart = () => {
                return this.update({state: 'executing'})
            };

            const onDone = () => {
                _callback();
                return this.update({state: 'done'})
            };
            const onFailure = (err) => {
                _callback(err);
                return this.update({state: `errored - ${err.toString()}`})
                    .then(() => Promise.reject(err))
            };

            const _promise = new Promise((resolve, reject) => {
                _callback = (err, result) => err ? reject(err) : resolve(result);
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
                _promise,
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