/**
 * Safely extract an array from an API response.
 * Handles both formats:
 *   - Direct array: res.data = [...]
 *   - Wrapped object: res.data = { success: true, data: [...] }
 *
 * @param data - The axios `res.data` value
 * @returns An array (or empty array if data is neither format)
 */
export function extractArray<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}
