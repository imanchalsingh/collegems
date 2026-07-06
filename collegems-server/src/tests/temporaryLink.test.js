import test from 'node:test';
import assert from 'node:assert';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../models/User.model.js';
import Resource from '../models/Resource.model.js';
import TemporaryLink from '../models/TemporaryLink.model.js';
import * as tempLinkService from '../services/temporaryLink.service.js';

let mongoServer;

test('Temporary Link Service Tests', async (t) => {
  // 1. Setup
  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // 2. Teardown
  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Clear data before each test
  t.beforeEach(async () => {
    await TemporaryLink.deleteMany({});
    await User.deleteMany({});
    await Resource.deleteMany({});
  });

  await t.test('should generate a link for a valid resource', async () => {
    const user = await User.create({
      name: 'Test Teacher', email: 'teacher@test.com', password: 'pwd', role: 'teacher', department: 'CS'
    });
    
    const resource = await Resource.create({
      name: 'Test Resource',
      type: 'projector'
    });

    const link = await tempLinkService.generateLink('Resource', resource._id, user._id, 60);

    assert.ok(link.token);
    assert.strictEqual(link.resourceId.toString(), resource._id.toString());
    assert.strictEqual(link.resourceType, 'Resource');
    assert.strictEqual(link.createdBy.toString(), user._id.toString());
    assert.ok(link.expiresAt > new Date());
  });

  await t.test('should fail to generate link for unsupported resource type', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await assert.rejects(
      tempLinkService.generateLink('InvalidType', fakeId, fakeId, 60),
      /Unsupported resource type/
    );
  });

  await t.test('should fail to generate link if resource does not exist', async () => {
    const user = await User.create({
      name: 'Test Teacher', email: 'teacher2@test.com', password: 'pwd', role: 'teacher', department: 'CS'
    });
    const fakeResourceId = new mongoose.Types.ObjectId();
    
    await assert.rejects(
      tempLinkService.generateLink('Resource', fakeResourceId, user._id, 60),
      /Resource with ID .* not found/
    );
  });

  await t.test('should access a valid link', async () => {
    const user = await User.create({
      name: 'Test Teacher', email: 'teacher3@test.com', password: 'pwd', role: 'teacher', department: 'CS'
    });
    
    const resource = await Resource.create({
      name: 'Test Resource',
      type: 'projector'
    });

    const link = await tempLinkService.generateLink('Resource', resource._id, user._id, 60);
    const data = await tempLinkService.validateAndAccessLink(link.token);

    assert.strictEqual(data.resourceType, 'Resource');
    assert.strictEqual(data.resource._id.toString(), resource._id.toString());
  });

  await t.test('should block access to expired link', async () => {
    const user = await User.create({
      name: 'Test Teacher', email: 'teacher4@test.com', password: 'pwd', role: 'teacher', department: 'CS'
    });
    
    const resource = await Resource.create({
      name: 'Test Resource',
      type: 'projector'
    });

    // Generate link with negative expiration (already expired)
    const link = await tempLinkService.generateLink('Resource', resource._id, user._id, -10);
    
    await assert.rejects(
      tempLinkService.validateAndAccessLink(link.token),
      /This link has expired/
    );
  });

  await t.test('should block access to revoked link', async () => {
    const user = await User.create({
      name: 'Test Teacher', email: 'teacher5@test.com', password: 'pwd', role: 'teacher', department: 'CS'
    });
    
    const resource = await Resource.create({
      name: 'Test Resource',
      type: 'projector'
    });

    const link = await tempLinkService.generateLink('Resource', resource._id, user._id, 60);
    await tempLinkService.revokeLink(link.token, user._id);
    
    await assert.rejects(
      tempLinkService.validateAndAccessLink(link.token),
      /This link has been revoked/
    );
  });

  await t.test('should block unauthorized revocation', async () => {
    const user1 = await User.create({
      name: 'User 1', email: 'u1@test.com', password: 'pwd', role: 'teacher', department: 'CS'
    });
    const user2 = await User.create({
      name: 'User 2', email: 'u2@test.com', password: 'pwd', role: 'teacher', department: 'CS'
    });
    
    const resource = await Resource.create({
      name: 'Test Resource',
      type: 'projector'
    });

    const link = await tempLinkService.generateLink('Resource', resource._id, user1._id, 60);
    
    // User 2 trying to revoke User 1's link
    await assert.rejects(
      tempLinkService.revokeLink(link.token, user2._id),
      /Unauthorized to revoke this link/
    );
  });

  await t.test('should allow admin to revoke any link', async () => {
    const user1 = await User.create({
      name: 'User 1', email: 'u3@test.com', password: 'pwd', role: 'teacher', department: 'CS'
    });
    const admin = await User.create({
      name: 'Admin', email: 'admin@test.com', password: 'pwd', role: 'admin'
    });
    
    const resource = await Resource.create({
      name: 'Test Resource',
      type: 'projector'
    });

    const link = await tempLinkService.generateLink('Resource', resource._id, user1._id, 60);
    
    await tempLinkService.revokeLink(link.token, admin._id, true);
    
    const updatedLink = await TemporaryLink.findOne({ token: link.token });
    assert.strictEqual(updatedLink.isRevoked, true);
  });
});
