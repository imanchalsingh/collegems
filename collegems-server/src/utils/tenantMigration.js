import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tenant from '../models/Tenant.model.js';
import User from '../models/User.model.js';
import Course from '../models/Course.model.js';
// Add other models as necessary

dotenv.config();

const runMigration = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB for Tenant Migration');

    // 1. Create Default Tenant
    let defaultTenant = await Tenant.findOne({ slug: 'default-college' });
    if (!defaultTenant) {
      defaultTenant = await Tenant.create({
        name: 'Default College',
        slug: 'default-college',
        adminEmail: 'admin@defaultcollege.edu',
        status: 'active',
      });
      console.log('Created Default Tenant:', defaultTenant._id);
    } else {
      console.log('Default Tenant already exists:', defaultTenant._id);
    }

    const tenantId = defaultTenant._id;

    // 2. Assign tenantId to all Users missing one
    const userResult = await User.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId } }
    );
    console.log(`Migrated ${userResult.modifiedCount} Users.`);

    // 3. Assign tenantId to all Courses missing one
    const courseResult = await Course.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId } }
    );
    console.log(`Migrated ${courseResult.modifiedCount} Courses.`);

    console.log('Migration complete. You can expand this script to cover all 60 collections.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
