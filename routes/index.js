const fs = require('fs');
const path = require('path');

const express = require('express');

const scheduler = require('../services/scheduler');

const router = express.Router();
const readmeContent = fs.readFileSync(path.join(process.cwd(), '/README.md'));

/* GET home page. */
router.get('/', (req, res, next) => {
    res.render('index', {
        title: 'Request Scheduler',
        content: readmeContent
    });
});

router.use('/cron', (req, res, next) => {
    scheduler.update()
        .then((tasks) => res.json({count: tasks.length, tasks}))
        .catch(next)
});

module.exports = router;
