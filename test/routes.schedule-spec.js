const url = require('url');

const nock = require('nock');
const chai = require('chai');
const supertest = require('supertest');

const expect = chai.expect;
const app = require('../app');
const request = supertest(app);
const testServer = nock(/test/);

describe('/schedule', function () {

    describe('/', () => {

        afterEach(() => {
            nock.cleanAll();
        });


        it('creates a new job', function () {
            this.timeout(10 * 1000);

            let startJobCount;
            let tempScheduledTaskId;

            testServer.get(/schedule-test/)
                .reply(200);

            return request.get('/schedule/list')
                .expect(200)
                .then(res => {
                    startJobCount = res.body.length;

                    return request.post('/schedule')
                        .accept('json')
                        .send({
                            wait: 5000,
                            callback: 'http://test.com/schedule-test'
                        })
                        .expect(200)
                })
                .then(res => {
                    tempScheduledTaskId = res.body.taskId;

                    return request.get('/schedule/list')
                        .expect(200)
                })
                .then(res => {
                    expect(res.body.length).to.eql(startJobCount + 1, 'there should be one more job');

                    return request.del(`/schedule/${tempScheduledTaskId}`)
                        .expect(200);
                })
                .catch(err => {
                    console.error('request err: %s', err);
                    // attempt to delete test task
                    return request.del(`/schedule/${tempScheduledTaskId}`)
                        .expect(200)
                        .then(() => Promise.reject(err));
                })
        });

        it('hits a url at a specified time', function () {

            const testWaitDuration = 3 * 1000;
            const testEndpoint = `/stop-test/${Date.now()}`;
            this.timeout(15 * 1000);

            const dummyTaskAPI = nock(/test/)
                .get(testEndpoint)
                .reply(200);

            return request.post('/schedule')
                .accept('json')
                .send({
                    callback: url.resolve('http://test.com', testEndpoint),
                    callbackMethod: 'get',
                    wait: testWaitDuration
                })
                .expect(200)
                .then(res => {
                    return new Promise((resolve, reject) => {
                        setTimeout(resolve, testWaitDuration);
                    })
                })
                .then(() => {
                    expect(dummyTaskAPI.isDone()).to.eql(true, 'dummy task should have been executed');
                    return Promise.resolve();
                });

        });

        it('responds with json when "Accept" header is set to "application/json"', function () {
            this.timeout(7 * 1000);

            let testTaskId;

            // handle api call so as to not interfere with other tests
            testServer.get(/accept-json-test/)
                .reply(200);

            return request.post('/schedule')
                .accept('json')
                .send({
                    callback: 'http://test.com/accept-json-test',
                    callbackMethod: 'get',
                    wait: 4000
                })
                .expect(200)
                .expect('Content-Type', /json/)
                .then(res => {
                    expect(res.body.taskId).to.exist;
                    testTaskId = res.body.taskId;
                    return Promise.resolve();
                })
                .then(() => {
                    // clean up after test. removes temporary scheduled task
                    return request.del(`/schedule/${testTaskId}`)
                        .expect(200)
                })
        });
    });

    describe('GET /list', () => {

        it('responds with an array', () => {
            return request.get('/schedule/list')
                .expect(200)
                .then(res => {
                    expect(res.body).to.be.an('array');
                    return Promise.resolve();
                })
        })
    });

    describe('DELETE /:taskId', function () {

        afterEach(() => {
            nock.cleanAll();
        });

        it('it stops a previous job request from executing', function () {
            this.timeout(15 * 1000);

            let taskId;

            const testWaitDuration = 3 * 1000;
            const testEndpoint = `/stop-test/${Date.now()}`;
            const dummyTaskAPI = nock(/test/)
                .get(testEndpoint)
                .reply(200);

            return request.post('/schedule')
                .accept('json')
                .send({
                    callback: url.resolve('http://test.com', testEndpoint),
                    callbackMethod: 'get',
                    wait: testWaitDuration
                })
                .expect(200)
                .then(res => {
                    taskId = res.body.taskId;

                    console.log(`cancelling task (${taskId})`);

                    return request.del(`/schedule/${taskId}`)
                        .expect(200)
                })
                .then(res => {
                    return new Promise((resolve, reject) => {
                        setTimeout(resolve, testWaitDuration);
                    })
                })
                .then(() => {
                    expect(dummyTaskAPI.isDone()).to.eql(false, 'dummy task should not have been executed');
                    return Promise.resolve();
                });
        });
    });
});
