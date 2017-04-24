const fs = require('fs');
const path = require('path');

const express = require('express');

const scheduler = require('../services/scheduler');

const router = express.Router();
const readmeContent = fs.readFileSync(path.join(process.cwd(), '/README.md'));

/* GET home page. */
router.get('/', (req, res, next) => {
    res.render('index', {
        title: 'LPT Request Scheduler',
        content: readmeContent
    });
});

router.use('/cron', (req, res, next) => {
    scheduler.update()
        .then((result) => res.json(result))
        .catch(next)
});

module.exports = router;
