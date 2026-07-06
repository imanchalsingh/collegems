import mongoose from "mongoose";

/**
 * Escapes special characters in a string for use in a regular expression.
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Analyzes a given sequence and generates a repair preview.
 * @param {string} modelName - The Mongoose model name (e.g., 'User')
 * @param {string} fieldName - The field to check (e.g., 'studentId')
 * @param {string} prefix - The sequence prefix (e.g., 'STU')
 * @param {number} padding - The length of the numeric part (e.g., 3 for STU001)
 * @returns {Promise<Object>} The analysis result and repair preview
 */
export const analyzeSequence = async (modelName, fieldName, prefix, padding) => {
  if (!mongoose.models[modelName]) {
    throw new Error(`Model ${modelName} is not registered`);
  }

  const Model = mongoose.model(modelName);

  // Find all documents where field starts with the prefix
  const regex = new RegExp(`^${escapeRegExp(prefix)}\\d{${padding}}$`);
  const query = {};
  query[fieldName] = regex;

  const records = await Model.find(query).select(`_id ${fieldName}`).lean();

  if (records.length === 0) {
    return {
      totalRecords: 0,
      gaps: [],
      duplicates: [],
      preview: [],
      message: "No records found matching the sequence pattern.",
    };
  }

  // Map to objects with parsed numeric values
  const parsedRecords = records.map((record) => {
    const stringValue = record[fieldName];
    const numericPart = stringValue.substring(prefix.length);
    return {
      id: record._id,
      originalValue: stringValue,
      numericValue: parseInt(numericPart, 10),
    };
  });

  // Sort by numeric value ascending
  parsedRecords.sort((a, b) => a.numericValue - b.numericValue);

  const gaps = [];
  const duplicates = [];
  const preview = [];
  
  const seenNumbers = new Set();
  
  // Find duplicates
  for (const record of parsedRecords) {
    if (seenNumbers.has(record.numericValue)) {
      duplicates.push(record.originalValue);
    } else {
      seenNumbers.add(record.numericValue);
    }
  }

  // We filter out duplicates for the gap shifting algorithm to work cleanly
  const uniqueParsedRecords = parsedRecords.filter((record, index, self) =>
    index === self.findIndex((t) => t.numericValue === record.numericValue)
  );

  let currentExpected = 1;

  for (let i = 0; i < uniqueParsedRecords.length; i++) {
    const record = uniqueParsedRecords[i];

    // Detect gaps
    while (currentExpected < record.numericValue) {
      gaps.push(`${prefix}${String(currentExpected).padStart(padding, "0")}`);
      currentExpected++;
    }

    // If actual number is greater than expected (we shifted things down)
    if (record.numericValue > (i + 1)) {
      const newValue = `${prefix}${String(i + 1).padStart(padding, "0")}`;
      preview.push({
        recordId: record.id,
        oldValue: record.originalValue,
        newValue: newValue,
      });
    }
    
    currentExpected = record.numericValue + 1;
  }

  return {
    totalRecords: records.length,
    gaps,
    duplicates: [...new Set(duplicates)], // unique duplicate strings
    preview,
    message: preview.length > 0 
      ? `Found ${gaps.length} gap(s). ${preview.length} record(s) need to be shifted.`
      : "Sequence is perfectly contiguous.",
  };
};

/**
 * Executes the proposed repair sequence.
 * @param {string} modelName - The Mongoose model name
 * @param {string} fieldName - The field to update
 * @param {Array} previewData - The array of { recordId, newValue } changes
 * @param {string} editorId - ID of the user performing the repair
 * @returns {Promise<Object>} Execution result
 */
export const executeRepair = async (modelName, fieldName, previewData, editorId) => {
  if (!mongoose.models[modelName]) {
    throw new Error(`Model ${modelName} is not registered`);
  }

  const Model = mongoose.model(modelName);
  let successCount = 0;
  let failCount = 0;

  for (const change of previewData) {
    try {
      const updateData = {};
      updateData[fieldName] = change.newValue;
      
      // Update one by one to ensure hooks (like snapshot plugin) fire correctly
      await Model.findByIdAndUpdate(
        change.recordId,
        updateData,
        { new: true, editorId, runValidators: true }
      );
      successCount++;
    } catch (err) {
      console.error(`Error repairing sequence for record ${change.recordId}:`, err);
      failCount++;
    }
  }

  return {
    success: true,
    message: `Successfully repaired ${successCount} record(s). Failed: ${failCount}`,
    successCount,
    failCount,
  };
};
