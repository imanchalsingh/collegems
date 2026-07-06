import EligibilityRule from "../models/EligibilityRule.model.js";
import EligibilityOverride from "../models/EligibilityOverride.model.js";

/**
 * Universal Eligibility Validation Engine
 * Dynamically validates a student against active module rules.
 */
export const evaluateEligibility = async (studentId, moduleName, contextData = {}) => {
  // 1. Check for Administrative Overrides first
  const override = await EligibilityOverride.findOne({ studentId, module: moduleName }).lean();
  if (override) {
    return {
      isEligible: true,
      overridden: true,
      reason: "HOD Override applied",
      failedCriteria: []
    };
  }

  // 2. Fetch Active Rules for this Module
  const rules = await EligibilityRule.find({ module: moduleName, isActive: true }).lean();
  if (!rules || rules.length === 0) {
    // If no rules exist, default to eligible
    return { isEligible: true, failedCriteria: [] };
  }

  const failedCriteria = [];

  // 3. Evaluate each rule dynamically
  for (const rule of rules) {
    let actualValue = null;

    // Map the rule type to the provided context data
    switch (rule.type) {
      case "ATTENDANCE":
        actualValue = contextData.attendancePercentage;
        break;
      case "FEE_DUE":
        actualValue = contextData.feeDueBalance;
        break;
      case "CGPA":
        actualValue = contextData.cgpa;
        break;
      case "DISCIPLINARY":
        actualValue = contextData.activeDisciplinaryHolds;
        break;
    }

    if (actualValue === undefined || actualValue === null) {
      failedCriteria.push({
        code: `MISSING_DATA_${rule.type}`,
        message: `System could not verify ${rule.type} status.`
      });
      continue;
    }

    // Dynamic Threshold Comparison
    let passed = false;
    switch (rule.comparison) {
      case ">=": passed = actualValue >= rule.threshold; break;
      case "<=": passed = actualValue <= rule.threshold; break;
      case "==": passed = actualValue === rule.threshold; break;
      case ">": passed = actualValue > rule.threshold; break;
      case "<": passed = actualValue < rule.threshold; break;
    }

    if (!passed) {
      failedCriteria.push({
        code: rule.type,
        message: rule.message.replace("{value}", actualValue).replace("{threshold}", rule.threshold)
      });
    }
  }

  return {
    isEligible: failedCriteria.length === 0,
    overridden: false,
    failedCriteria
  };
};
