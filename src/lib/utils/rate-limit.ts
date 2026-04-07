interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const entries = new Map<string, RateLimitEntry>();

export function rateLimit(
  ip: string,
  opts: { limit: number; windowMs: number },
): { success: boolean; remaining: number } {
  const now = Date.now();

  // Clean up expired entries
  for (const [key, entry] of entries) {
    if (now > entry.resetAt) entries.delete(key);
  }

  const existing = entries.get(ip);

  if (!existing || now > existing.resetAt) {
    entries.set(ip, { count: 1, resetAt: now + opts.windowMs });
    return { success: true, remaining: opts.limit - 1 };
  }

  existing.count++;

  if (existing.count > opts.limit) {
    return { success: false, remaining: 0 };
  }

  return { success: true, remaining: opts.limit - existing.count };
}
