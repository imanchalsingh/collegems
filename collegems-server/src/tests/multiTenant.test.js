import { describe, it, before, after } from 'node:test';
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
