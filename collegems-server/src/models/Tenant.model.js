import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tenant name is required'],
    trim: true,
  },
  slug: {
    type: String,
    required: [true, 'Tenant slug/subdomain is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending'],
    default: 'active',
  },
  branding: {
    logoUrl: { type: String, default: '' },
    themeColor: { type: String, default: '#000000' },
  },
  subscription: {
    plan: { type: String, default: 'free' },
    validUntil: { type: Date },
  },
  adminEmail: {
    type: String,
    required: [true, 'Admin email is required for the tenant'],
    lowercase: true,
    trim: true,
  }
}, { timestamps: true, skipTenant: true });

export default mongoose.model('Tenant', tenantSchema);
