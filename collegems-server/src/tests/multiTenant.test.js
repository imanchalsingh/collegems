import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import tenantPlugin from '../utils/tenantPlugin.js';
import { tenantContext } from '../utils/asyncLocalStorage.js';
import Tenant from '../models/Tenant.model.js';

let mongoServer;

describe('Multi-Tenant Architecture - Edge Cases & Data Isolation', () => {
  let TestModel;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Apply global plugin for testing (this mimics what we did in app.js)
    mongoose.plugin(tenantPlugin);

    // Create a dummy schema to test the plugin behavior on standard collections
    const testSchema = new mongoose.Schema({
      name: String
    });
    // Compile model
    TestModel = mongoose.model('TestEntity', testSchema);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('Edge Case: Should prevent saving a new document if there is no active tenant context', async () => {
    const doc = new TestModel({ name: 'Should Fail' });
    try {
      await doc.save();
      assert.fail('Should have thrown an error blocking the save operation');
    } catch (error) {
      assert.match(error.message, /tenantId is strictly required/);
    }
  });

  it('Data Isolation: Should automatically assign tenantId on creation and strictly isolate read queries by tenant', async () => {
    const tenantA = new mongoose.Types.ObjectId();
    const tenantB = new mongoose.Types.ObjectId();

    // 1. Create Data under Tenant A Context
    await new Promise((resolve) => {
      tenantContext.run({ tenantId: tenantA.toString() }, async () => {
        const doc1 = new TestModel({ name: 'Course belonging to College A' });
        await doc1.save();
        resolve();
      });
    });

    // 2. Create Data under Tenant B Context
    await new Promise((resolve) => {
      tenantContext.run({ tenantId: tenantB.toString() }, async () => {
        const doc2 = new TestModel({ name: 'Course belonging to College B' });
        await doc2.save();
        resolve();
      });
    });

    // 3. Verify Data Isolation for Tenant A
    await new Promise((resolve) => {
      tenantContext.run({ tenantId: tenantA.toString() }, async () => {
        const results = await TestModel.find();
        assert.strictEqual(results.length, 1, 'Tenant A should only see exactly 1 record');
        assert.strictEqual(results[0].name, 'Course belonging to College A', 'Tenant A should not see Tenant B data');
        resolve();
      });
    });

    // 4. Verify Data Isolation for Tenant B
    await new Promise((resolve) => {
      tenantContext.run({ tenantId: tenantB.toString() }, async () => {
        const results = await TestModel.find();
        assert.strictEqual(results.length, 1, 'Tenant B should only see exactly 1 record');
        assert.strictEqual(results[0].name, 'Course belonging to College B', 'Tenant B should not see Tenant A data');
        resolve();
      });
    });
  });

  it('Edge Case: Should skip tenantId injection for models configured with skipTenant: true', async () => {
    // This tests the logic that protects the core Tenant.model.js from circular dependencies
    const skippedSchema = new mongoose.Schema({ data: String }, { skipTenant: true });
    const SkippedModel = mongoose.model('SkippedEntity', skippedSchema);
    
    const paths = Object.keys(SkippedModel.schema.paths);
    assert.strictEqual(paths.includes('tenantId'), false, 'Models with skipTenant should NOT have a tenantId field injected');
  });
});

// ---------------------------------------------------------------------------
// tenantResolver.js — Security boundary tests
// These tests invoke the middleware directly using mock req/res objects so no
// HTTP server is required.  They share the same in-memory MongoDB that was
// started above, but manage their own connection lifecycle.
// ---------------------------------------------------------------------------
describe('tenantResolver Middleware — Security Boundary', () => {
  let mongoServer2;
  let tenantResolver;

  // Helper: builds a lightweight mock req/res/next triple.
  const makeMocks = ({ headers = {}, path = '/api/courses' } = {}) => {
    const req = { headers, path };
    const res = {
      _status: null,
      _body: null,
      status(code) { this._status = code; return this; },
      json(body)   { this._body = body;   return this; },
    };
    const next = () => { res._next = true; };
    return { req, res, next };
  };

  before(async () => {
    mongoServer2 = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer2.getUri());

    // Import the middleware AFTER the DB is ready so Tenant model can connect.
    const mod = await import('../middlewares/tenantResolver.js');
    tenantResolver = mod.default;
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer2.stop();
  });

  beforeEach(async () => {
    // Clear all collections between tests for a clean slate.
    const collections = mongoose.connection.collections;
    for (const col of Object.values(collections)) {
      await col.deleteMany({});
    }
  });

  it('Security Fix 1: Invalid x-tenant-id (non-ObjectId) must return HTTP 400, never Tenant.findOne()', async () => {
    const { req, res, next } = makeMocks({ headers: { 'x-tenant-id': 'invalid-id' } });

    await tenantResolver(req, res, next);

    assert.strictEqual(res._status, 400, 'Expected HTTP 400 for a non-ObjectId tenant header');
    assert.ok(res._body && !res._body.success, 'Response body should indicate failure');
    assert.ok(!res._next, 'next() must NOT be called when tenant ID is invalid');
  });

  it('Security Fix 2a: Missing x-tenant-id with ALLOW_DEV_TENANT_BYPASS unset must return HTTP 400', async () => {
    const saved = process.env.ALLOW_DEV_TENANT_BYPASS;
    delete process.env.ALLOW_DEV_TENANT_BYPASS; // ensure flag is absent

    const { req, res, next } = makeMocks(); // no x-tenant-id header
    await tenantResolver(req, res, next);

    // Restore
    if (saved !== undefined) process.env.ALLOW_DEV_TENANT_BYPASS = saved;

    assert.strictEqual(res._status, 400, 'Expected HTTP 400 when header is absent and bypass is not enabled');
    assert.ok(!res._next, 'next() must NOT be called when tenant header is missing and bypass is off');
  });

  it('Security Fix 2b: Missing x-tenant-id with ALLOW_DEV_TENANT_BYPASS=true + NODE_ENV=test must resolve Test Tenant', async () => {
    const savedBypass  = process.env.ALLOW_DEV_TENANT_BYPASS;
    const savedNodeEnv = process.env.NODE_ENV;

    process.env.ALLOW_DEV_TENANT_BYPASS = 'true';
    process.env.NODE_ENV = 'test';

    const { req, res, next } = makeMocks(); // no x-tenant-id header
    await tenantResolver(req, res, next);

    // Restore
    process.env.ALLOW_DEV_TENANT_BYPASS = savedBypass  ?? '';
    process.env.NODE_ENV                = savedNodeEnv ?? '';

    assert.ok(res._next, 'next() should be called when bypass is explicitly enabled in test mode');
    assert.ok(req.tenantId, 'req.tenantId should be set after a successful bypass resolution');
    assert.strictEqual(req.tenant?.slug, 'test-tenant-slug', 'Resolved tenant should be the Test Tenant');
  });
});
