import mongoose from 'mongoose';
import Tenant from '../models/Tenant.model.js';
import { tenantContext } from '../utils/asyncLocalStorage.js';

/**
 * Middleware to resolve the tenant from the request and attach it to the AsyncLocalStorage context.
 * It checks the 'x-tenant-id' header first, falling back to subdomain parsing if needed in the future.
 *
 * Security contract:
 *  - Invalid ObjectId values in x-tenant-id → 400 (never falls back to Tenant.findOne())
 *  - Dev/test tenant bypass requires BOTH:
 *      ALLOW_DEV_TENANT_BYPASS=true  (explicit opt-in)
 *      NODE_ENV === 'development' | 'test'  OR the process is running under Node's --test runner
 *  - A missing/undefined NODE_ENV is NOT treated as development mode.
 */
const tenantResolver = async (req, res, next) => {
  try {
    // Super-admin routes or webhooks can bypass tenant resolution by hitting specific base paths
    if (req.path.startsWith('/api/super-admin') || req.path.startsWith('/api/webhooks')) {
      return next();
    }

    let tenantId = req.headers['x-tenant-id'];

    // Dev/test bypass: requires an EXPLICIT opt-in flag AND an explicit development/test NODE_ENV.
    // A missing NODE_ENV is intentionally NOT treated as development — it must be set.
    const isExplicitDevOrTest =
      process.env.ALLOW_DEV_TENANT_BYPASS === 'true' &&
      (process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'test' ||
        process.execArgv.includes('--test') ||
        process.argv.some((arg) => arg.includes('test')));

    if (!tenantId && isExplicitDevOrTest) {
      let mockTenant = await Tenant.findOne({ slug: 'test-tenant-slug' });
      if (!mockTenant) {
        mockTenant = await Tenant.create({
          name: 'Test Tenant',
          slug: 'test-tenant-slug',
          adminEmail: 'test-admin@college.edu',
          status: 'active',
        });
      }
      tenantId = mockTenant._id.toString();
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant Context Missing: x-tenant-id header is required for this request.',
      });
    }

    // Reject any value that is not a valid 24-character MongoDB ObjectId.
    // Never fall back to Tenant.findOne() — that would silently bind the request
    // to an arbitrary tenant and break tenant isolation.
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return res.status(400).json({
        success: false,
        message: 'Bad Request: x-tenant-id is not a valid tenant identifier.',
      });
    }

    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found. Make sure at least one tenant exists in your database!',
      });
    }

    if (tenant.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This institution account is suspended or pending activation.',
      });
    }

    // Attach to request object (for legacy controller access)
    req.tenantId = tenant._id.toString();
    req.tenant = tenant;

    // Run the rest of the request within the AsyncLocalStorage context
    // This allows deep Mongoose plugins to access the tenantId without having req passed to them!
    tenantContext.run({ tenantId: req.tenantId }, () => {
      next();
    });

  } catch (error) {
    console.error('Tenant Resolver Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during tenant resolution.' });
  }
};

export default tenantResolver;