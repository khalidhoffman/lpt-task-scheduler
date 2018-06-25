const url = require('url');

const nock = require('nock');
const {expect} = require('chai');
const supertest = require('supertest');

const app = require('../app');
const sequelize = require('../services/sequelize');
const request = supertest(app);

describe('/schedule', function () {

    before(function(){
        return sequelize.sync({force: true})
    });

    describe('POST /', () => {

        it('creates a new job', function () {
            this.timeout(10 * 1000);

            let startJobCount;
            let tempScheduledTaskId;


            return request.get('/schedule/list')
                .expect(200)
                .then(res => {
                    startJobCount = res.body.length;

                    return request.post('/schedule')
                        .accept('json')
                        .send({
                            wait: 5000,
                            callback: 'http://create-test.com/schedule-test'
                        })
                        .expect(200)
                })
                .then(res => {
                    expect(res.body.taskId).to.exist;
                    tempScheduledTaskId = res.body.taskId;

                    return request.get('/schedule/list').expect(200)
                })
                .then(res => {
                    const taskIds = res.body.map(task => task.taskId);
                    expect(taskIds.includes(tempScheduledTaskId)).to.eql(true, `list should contain task ${tempScheduledTaskId}`);

                    return request.del(`/schedule/${tempScheduledTaskId}`).expect(200);
                })
                .catch(err => {
                    console.error('request err: %s', err);
                    // attempt to delete test task
                    return request.del(`/schedule/${tempScheduledTaskId}`).expect(200)
                        .then(() => Promise.reject(err));
                })
        });

        it('makes a callback request at a specified time', function () {

            const testWaitDuration = 3 * 1000;
            const testMinWaitDuration = testWaitDuration / 2;
            const testMaxWaitDuration = testWaitDuration * 1.5;
            const testEndpoint = `/some-endpoint/${Date.now()}`;
            this.timeout(testWaitDuration * 5);

            const dummyTaskAPI = nock(/execute-test/)
                .get(testEndpoint)
                .reply(200);

            return request.post('/schedule')
                .accept('json')
                .send({
                    callback: url.resolve('http://execute-test.com', testEndpoint),
                    callbackMethod: 'get',
                    wait: testWaitDuration
                })
                .expect(200)
                .then(res => {
                    return Promise.all([
                        new Promise((resolve, reject) => {
                            setTimeout(() => {
                                expect(dummyTaskAPI.isDone()).to.eql(false, 'dummy task was executed too early');
                                resolve()
                            }, testMinWaitDuration);
                        }),
                        new Promise((resolve, reject) => {
                            setTimeout(() => {
                                expect(dummyTaskAPI.isDone()).to.eql(true, 'dummy task should have been executed');
                                resolve()
                            }, testMaxWaitDuration);
                        })
                    ])
                })

        });

        it('responds with json when "Accept" header is set to "application/json"', function () {
            this.timeout(7 * 1000);

            let testTaskId;


            return request.post('/schedule')
                .accept('json')
                .send({
                    callback: 'http://accept-json-test.com/accept-json-test',
                    callbackMethod: 'get',
                    wait: 3000
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
            const dummyTaskAPI = nock(/delete-test/)
                .get(testEndpoint)
                .reply(200);

            return request.post('/schedule')
                .accept('json')
                .send({
                    callback: url.resolve('http://delete-test.com', testEndpoint),
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
                    return new Promise((resolve) => {
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
