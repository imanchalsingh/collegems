// src/utils/queryProfiler.js

/**
 * Helper to profile a Mongoose query execution time.
 * Usage example:
 *   const q = Attendance.find({ student: id });
 *   await profileQuery(q, 'find attendance by student');
 */
export async function profileQuery(query, label = 'Query') {
  const start = Date.now();
  try {
    const exec = await query.explain('executionStats');
    const duration = Date.now() - start;
    console.log(`[${label}] Execution time: ${duration}ms`);
    if (exec && exec.executionStats) {
      console.log(`[${label}] Docs examined: ${exec.executionStats.totalDocsExamined}`);
      console.log(`[${label}] Keys examined: ${exec.executionStats.totalKeysExamined}`);
    }
    return exec;
  } catch (err) {
    // If explain not supported (e.g., aggregation), fallback to normal execution
    const result = await query;
    console.log(`[${label}] Execution time (no explain): ${Date.now() - start}ms`);
    return result;
  }
}
