/**
 * Module dependencies.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ngrok = require('ngrok');
const app = require('../app');
const debug = require('debug')('task-scheduler:server');

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function initNgrok(port) {

    return new Promise((resolve, reject) => {

        ngrok.connect(parseInt(port), (err, domain) => {
            if (err) {
                reject(err);
                return;
            }


            debug(`Listening at ${domain}`);
            resolve(domain);
        })
    })
}

function updateCronScript(domain) {
    const cronScript = `#!/bin/sh\ncurl -s ${domain}/cron > /dev/null`;

    return new Promise((resolve, reject) => {
        fs.writeFile(path.join(process.cwd(), '/bin/cron.sh'), cronScript, (err) => {
            err ? console.error(err) : debug('updated cron.sh')
        })
    })
}

function startUp(port) {
    if (process.env.NGROK) {
        return initNgrok(port);
    }
    return Promise.resolve(process.env.DOMAIN || 'http://localhost:3000');
}

function onListening() {
    const addr = server.address();
    const bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);


    startUp(parseInt(addr.port || process.env.PORT))
        .then((domain) => {
            return updateCronScript(domain)
        })
        .catch((err) => {
            console.error(err);
        })
}
