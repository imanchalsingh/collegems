import { AsyncLocalStorage } from 'async_hooks';

export const tenantContext = new AsyncLocalStorage();

/**
 * Gets the current tenant ID from the async local storage context.
 * @returns {string|undefined} The tenant ID or undefined if not set.
 */
export const getTenantId = () => {
  const store = tenantContext.getStore();
  return store ? store.tenantId : undefined;
};
