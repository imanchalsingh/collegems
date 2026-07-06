import test from 'node:test';
import assert from 'node:assert';
import { cache } from '../utils/cache.js';
import { cacheResponse, invalidateCache } from '../middlewares/cache.middleware.js';

test('Cache Middleware and Utility Tests', async (t) => {
  t.beforeEach(() => {
    cache.clear();
  });

  await t.test('InMemoryCache basic operations', (t) => {
    cache.set('testKey', { data: 'testData' }, 1);
    
    // Get
    const val = cache.get('testKey');
    assert.deepStrictEqual(val, { data: 'testData' });

    // Del
    cache.del('testKey');
    assert.strictEqual(cache.get('testKey'), null);
  });

  await t.test('InMemoryCache expiration', async (t) => {
    cache.set('expireKey', 'temp', 0.1); // 100ms TTL
    
    const valBefore = cache.get('expireKey');
    assert.strictEqual(valBefore, 'temp');

    await new Promise((resolve) => setTimeout(resolve, 150));

    const valAfter = cache.get('expireKey');
    assert.strictEqual(valAfter, null); // should be expired
  });

  await t.test('cacheResponse middleware - Cache MISS then HIT', (t) => {
    let callCount = 0;
    
    // Mock req, res, next
    const req = {
      method: 'GET',
      originalUrl: '/api/test/resource'
    };

    let nextCalled = false;
    const next = () => { nextCalled = true; };
    
    let headerKey = '';
    let headerVal = '';
    let responseData = null;

    const res = {
      statusCode: 200,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      setHeader: (key, val) => {
        headerKey = key;
        headerVal = val;
      },
      json: function(data) {
        responseData = data;
        callCount++;
        return this;
      }
    };

    // Initialize middleware with 10s TTL
    const middleware = cacheResponse(10);

    // Call 1: Should MISS
    middleware(req, res, next);
    
    assert.strictEqual(headerKey, 'X-Cache');
    assert.strictEqual(headerVal, 'MISS');
    assert.strictEqual(nextCalled, true);
    
    // Simulate controller sending JSON response
    res.json({ some: 'data' });
    assert.strictEqual(callCount, 1);
    assert.deepStrictEqual(responseData, { some: 'data' });
    
    // Reset next for call 2
    nextCalled = false;

    // Call 2: Should HIT
    middleware(req, res, next);
    
    assert.strictEqual(headerKey, 'X-Cache');
    assert.strictEqual(headerVal, 'HIT');
    assert.strictEqual(nextCalled, false); // Shouldn't call next on a HIT
    assert.strictEqual(callCount, 2);
    assert.deepStrictEqual(responseData, { some: 'data' });
  });

  await t.test('invalidateCache utility', (t) => {
    cache.set('cache:/api/courses/all', { data: 'courses' }, 60);
    cache.set('cache:/api/users/all', { data: 'users' }, 60);

    assert.ok(cache.get('cache:/api/courses/all'));
    
    invalidateCache('/api/courses');
    
    assert.strictEqual(cache.get('cache:/api/courses/all'), null); // Should be cleared
    assert.ok(cache.get('cache:/api/users/all')); // Should still exist
  });

  t.after(() => {
    cache.destroy(); // stop setInterval
  });
});
