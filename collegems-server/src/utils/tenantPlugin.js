import mongoose from 'mongoose';
import { getTenantId } from './asyncLocalStorage.js';

/**
 * Global Mongoose plugin for enforcing Row-Level Security (Tenant Isolation).
 * It automatically injects the tenantId into all queries and ensures new documents
 * are assigned to the active tenant.
 */
export default function tenantPlugin(schema, options) {
  if (schema.options && schema.options.skipTenant) {
    return;
  }

  // 1. Automatically inject the tenantId field into the schema
  schema.add({
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'tenantId is strictly required for this model'],
      index: true, // Crucial for multi-tenant query performance
    }
  });

  // 2. Intercept validation to auto-assign tenantId
  schema.pre('validate', function () {
    if (this.isNew && !this.tenantId) {
      const currentTenant = getTenantId();
      if (currentTenant) {
        this.tenantId = currentTenant;
      }
    }
  });

  // 3. Intercept all read/update/delete operations to enforce tenant filter
  const enforceTenantFilter = function () {
    const currentTenant = getTenantId();
    if (currentTenant) {
      this.where({ tenantId: currentTenant });
    } else {
      // If there is NO active tenant context (e.g., background job or super-admin script),
      // we must be extremely careful. By default, we DO NOT filter, allowing super-admins 
      // full access. However, in a strict SaaS, we might reject the query here.
      // For this implementation, we will log a warning or let it pass for system processes.
    }
  };

  schema.pre('find', enforceTenantFilter);
  schema.pre('findOne', enforceTenantFilter);
  schema.pre('findOneAndUpdate', enforceTenantFilter);
  schema.pre('updateMany', enforceTenantFilter);
  schema.pre('updateOne', enforceTenantFilter);
  schema.pre('deleteOne', enforceTenantFilter);
  schema.pre('deleteMany', enforceTenantFilter);
  schema.pre('countDocuments', enforceTenantFilter);

  // 4. Handle Aggregations
  schema.pre('aggregate', function () {
    const currentTenant = getTenantId();
    if (currentTenant) {
      // Inject a $match stage at the very beginning of the pipeline
      this.pipeline().unshift({ $match: { tenantId: new mongoose.Types.ObjectId(currentTenant) } });
    }
  });
}
