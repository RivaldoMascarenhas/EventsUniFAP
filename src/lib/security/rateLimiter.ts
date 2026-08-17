interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private ipMap = new Map<string, RateLimitEntry>();
  private lastCleanup = Date.now();

  /**
   * Check if a request from this IP is allowed.
   * @param ip Client IP Address
   * @param limit Max allowed requests within window (default: 8)
   * @param windowMs Window in milliseconds (default: 60,000 = 1 min)
   */
  public check(ip: string, limit = 8, windowMs = 60000): { allowed: boolean; remaining: number } {
    const now = Date.now();

    // Periodic auto-cleanup every 60s or when map exceeds 500 entries
    if (now - this.lastCleanup > 60000 || this.ipMap.size > 500) {
      this.cleanup();
      this.lastCleanup = now;
    }

    const entry = this.ipMap.get(ip);

    if (!entry || now > entry.resetAt) {
      this.ipMap.set(ip, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1 };
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0 };
    }

    entry.count += 1;
    return { allowed: true, remaining: limit - entry.count };
  }

  /**
   * Clean expired entries
   */
  public cleanup() {
    const now = Date.now();
    for (const [ip, entry] of this.ipMap.entries()) {
      if (now > entry.resetAt) {
        this.ipMap.delete(ip);
      }
    }
  }

  /**
   * Reset all entries (useful in testing)
   */
  public reset() {
    this.ipMap.clear();
    this.lastCleanup = Date.now();
  }
}

const globalForRateLimiter = globalThis as unknown as {
  rateLimiter: RateLimiter | undefined;
};

export const rateLimiter = globalForRateLimiter.rateLimiter ?? new RateLimiter();
globalForRateLimiter.rateLimiter = rateLimiter;

