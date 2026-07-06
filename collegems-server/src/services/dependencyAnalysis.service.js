import mongoose from 'mongoose';
import { dependencyMap } from '../config/dependencyRegistry.js';

/**
 * Calculates the impact of deleting a specific entity by counting all
 * registered dependent records in the database.
 * 
 * @param {string} entityType - The name of the entity (e.g., 'Course', 'User')
 * @param {string} entityId - The ObjectId of the entity
 * @returns {Promise<Object>} Impact summary object
 */
export const calculateImpact = async (entityType, entityId) => {
  const dependencies = dependencyMap[entityType];
  
  if (!dependencies || dependencies.length === 0) {
    return {
      hasDependencies: false,
      totalImpact: 0,
      summary: []
    };
  }

  // Fetch the primary entity so we can use its properties if needed (e.g. name instead of ObjectId)
  const PrimaryModel = mongoose.models[entityType];
  if (!PrimaryModel) {
    throw new Error(`Primary model ${entityType} not found.`);
  }

  const entity = await PrimaryModel.findById(entityId);
  if (!entity) {
    throw new Error(`${entityType} with ID ${entityId} not found.`);
  }

  const impactSummary = [];
  let totalImpact = 0;

  // Execute all count queries concurrently
  const promises = dependencies.map(async (dep) => {
    // Dynamically access the Mongoose model
    const Model = mongoose.models[dep.model];
    if (!Model) {
      console.warn(`Model ${dep.model} is not registered in Mongoose.`);
      return;
    }

    // Determine the query value
    const queryValue = dep.valueResolver ? dep.valueResolver(entity) : entityId;

    // Build the query
    const query = { [dep.foreignKey]: queryValue };
    if (dep.filter) {
      Object.assign(query, dep.filter);
    }

    const count = await Model.countDocuments(query);
    if (count > 0) {
      impactSummary.push({
        type: dep.description,
        count: count
      });
      totalImpact += count;
    }
  });

  await Promise.all(promises);

  return {
    hasDependencies: totalImpact > 0,
    totalImpact,
    summary: impactSummary
  };
};
