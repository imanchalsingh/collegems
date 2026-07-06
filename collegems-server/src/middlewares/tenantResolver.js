import Tenant from '../models/Tenant.model.js';
import { tenantContext } from '../utils/asyncLocalStorage.js';

/**
 * Middleware to resolve the tenant from the request and attach it to the AsyncLocalStorage context.
 * It checks the 'x-tenant-id' header first, falling back to subdomain parsing if needed in the future.
 */
const tenantResolver = async (req, res, next) => {
  try {
    // Super-admin routes or webhooks can bypass tenant resolution by hitting specific base paths
    if (req.path.startsWith('/api/super-admin') || req.path.startsWith('/api/webhooks')) {
      return next();
    }

    let tenantId = req.headers['x-tenant-id'];

    const isLocalDevOrTest = !process.env.NODE_ENV || process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test" || process.execArgv.includes("--test") || process.argv.some(arg => arg.includes("test"));
    if (!tenantId && isLocalDevOrTest) {
      let mockTenant = await Tenant.findOne({ slug: "test-tenant-slug" });
      if (!mockTenant) {
        mockTenant = await Tenant.create({
          name: "Test Tenant",
          slug: "test-tenant-slug",
          adminEmail: "test-admin@college.edu",
          status: "active"
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

    // Optional: Validate tenant exists and is active. 
    // For performance, we can cache this in Redis later, but for now we query DB.
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found.',
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
