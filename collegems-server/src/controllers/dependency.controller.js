import { calculateImpact } from '../services/dependencyAnalysis.service.js';
import { dependencyMap } from '../config/dependencyRegistry.js';

export const checkDependencies = async (req, res) => {
  try {
    const { entityType, id } = req.params;

    // Validate if the entityType is supported
    if (!dependencyMap[entityType]) {
      return res.status(400).json({ 
        success: false, 
        message: `Entity type '${entityType}' is not configured for dependency analysis.` 
      });
    }

    const impact = await calculateImpact(entityType, id);

    res.json({
      success: true,
      ...impact
    });
  } catch (error) {
    console.error("Error in dependency analysis:", error);
    
    // Check for not found error
    if (error.message.includes('not found')) {
       return res.status(404).json({ success: false, message: error.message });
    }

    res.status(500).json({ 
      success: false, 
      message: "Server error calculating dependencies" 
    });
  }
};
