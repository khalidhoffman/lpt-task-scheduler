setInterval(function(){
    require('http').get('http://localhost:4001/cron');
    debug('making cron request');
}, 60 * 1000);
