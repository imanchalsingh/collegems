class InMemoryCache {
  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, sets: 0 };
    // Optional: periodic cleanup of expired items to prevent memory leaks
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return item.value;
  }

  set(key, value, ttlSeconds = 60) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
    this.stats.sets++;
  }

  del(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0 };
  }

  getStats() {
    return { ...this.stats, keys: this.cache.size };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Graceful shutdown
  destroy() {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

// Export a singleton instance
export const cache = new InMemoryCache();
