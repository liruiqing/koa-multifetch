var assert = require('chai').assert;
var co = require('co');
var koa = require('koa');
var koaRoute = require('koa-route');
var request = require('supertest');
var batch = require('../lib/multiFetch');

describe('multifetch', function () {
  var app;

  before(function () {
    app = koa();
    app.use(koaRoute.post('/api', batch()));
    app.use(koaRoute.get('/api', batch()));
    app.use(koaRoute.get('/api/resource1', function* () {
      this.set('Custom-Header', 'why not');
      this.body = {result: 'resource1'};
    }));
    app.use(koaRoute.get('/api/resource2/:id', function* (id) {
      this.set('Other-Custom-Header', 'useful');
      this.body = {result: 'resource2/' + id};
    }));
    app.use(koaRoute.get('/api/boom', function* (id) {
      throw new Error('boom');
    }));
  });

  it ('should return code 404 if url is not found', function (done) {
    request.agent(app.listen())
      .post('/api')
      .send({wrong: '/wrong'})
      .expect(function (res) {
        assert.equal(res.body.wrong.code, 404);
        assert.deepEqual(res.body.wrong.body, {});
      })
      .end(done);
  });

  it ('should return code 500 if server error occur', function (done) {
    request.agent(app.listen())
      .post('/api')
      .send({boom: '/boom'})
      .expect(function (res) {
        assert.equal(res.body.boom.code, 500);
      })
      .end(done);
  });

  describe('GET', function () {

    it('should call each passed request and return their result', function (done) {
      request.agent(app.listen())
        .get('/api?resource1=/resource1&resource2=/resource2/5')
        .expect(function (res) {
          assert.equal(res.body.resource1.code, 200);
          assert.deepEqual(res.body.resource1.body, {result: 'resource1'});
          assert.equal(res.body.resource2.code, 200);
          assert.deepEqual(res.body.resource2.body, {result: 'resource2/5'});
        })
        .end(done);
    });

    it('should return the header for each request', function (done) {
      request.agent(app.listen())
        .get('/api?resource1=/resource1&resource2=/resource2/5')
        .expect(function (res) {
          assert.include(res.body.resource1.headers, {name: 'custom-header', value: 'why not'});
          assert.include(res.body.resource2.headers, {name: 'other-custom-header', value: 'useful'});
        })
        .end(done);
    });

  });

  describe('POST', function () {

    it ('should call each passed request and return their result', function (done) {
      request.agent(app.listen())
        .post('/api')
        .send({resource1: '/resource1', resource2: '/resource2/5'})
        .expect(function (res) {
          assert.equal(res.body.resource1.code, 200);
          assert.deepEqual(res.body.resource1.body, {result: 'resource1'});
          assert.equal(res.body.resource2.code, 200);
          assert.deepEqual(res.body.resource2.body, {result: 'resource2/5'});
        })
        .end(done);
    });

    it ('should return the header for each request', function (done) {
      request.agent(app.listen())
        .post('/api')
        .send({resource1: '/resource1', resource2: '/resource2/5'})
        .expect(function (res) {
          assert.include(res.body.resource1.headers, {name: 'custom-header', value: 'why not'});
          assert.include(res.body.resource2.headers, {name: 'other-custom-header', value: 'useful'});
        })
        .end(done);
    });

  });

  after(function () {
    delete app;
  });

});