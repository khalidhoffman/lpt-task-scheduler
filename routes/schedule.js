const _ = require('lodash');
const express = require('express');
const moment = require('moment');
const request = require('superagent');
const shortid = require('shortid');

const Tasks = require('../models/task');
const memoryCache = require('../services/memory-cache');

const router = express.Router();
const scheduledTaskCache = {};

router.post('/', function (req, res, next) {
    const now = new Date();
    const taskId = shortid.generate();
    const taskState = req.body._state || 'uninitialized';
    const callback = req.body.url || req.body.callback;
    const payload = req.body.payload;
    const callbackMethod = (req.body.method || 'get').toLowerCase();
    const callbackContentType = req.body.contentType || 'json';

    let startTimestamp;
    let waitDuration;

    if (req.body.time) {
        startTimestamp = moment(req.body.time);
        waitDuration = startTimestamp.diff(now);
    } else if (req.body.wait) {
        waitDuration = parseInt(req.body.wait);
        startTimestamp = moment().add(waitDuration, 'milliseconds');
    } else {
        waitDuration = 60 * 1000;
    }

    if (!(waitDuration > 0)) {
        waitDuration = 0;
    }

    Tasks.create({
        taskId,
        name: taskId,
        state: taskState,
        startTimestamp,
        payload,
        callback,
        callbackContentType,
        callbackMethod
    });

    res.json({
        taskId,
        waitDuration,
        startTimestamp
    });
});

router.get('/list', (req, res, next) => {
    res.json(memoryCache.list().map(taskMeta => taskMeta.model ? taskMeta.model.dataValues : taskMeta));

});

router.use([
    '/:id',
    '/:id/stop'
], (req, res, next) => {
    const taskId = req.params.id;
    const taskMeta = memoryCache.get(taskId);
    const taskRemovalParams = {
        where: {
            taskId: taskId
        }
    };

    if (taskMeta) {

        if ((req.path.match(/stop$/) || req.method.match(/delete/i))) {

            if (taskMeta.model) {
                clearTimeout(taskMeta._timeoutId);
                console.log(`(${req.params.id}) cleared timeout`);
                const prevTaskState = taskMeta.model.dataValues.state;
                const taskState = prevTaskState !== 'done' ? 'cancelled' : 'done';
                taskMeta.model.update({state: taskState})
                    .then(() => {
                        memoryCache.remove(taskId);
                        res.json({
                            state: taskState,
                            taskId: taskId
                        });
                    })
                    .catch(next);
                return;
            }
        }

        res.send(taskMeta);
    }

    next();
});

module.exports = router;
