type Bucket = { count: number; resetsAt: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(request: Request, scope: string, maximum: number, windowMs: number) {
  const address = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${scope}:${address}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetsAt <= now) {
    buckets.set(key, { count: 1, resetsAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [entry, value] of buckets) if (value.resetsAt <= now) buckets.delete(entry);
    }
    return { limited: false, retryAfter: 0 };
  }
  if (bucket.count >= maximum) return { limited: true, retryAfter: Math.max(1, Math.ceil((bucket.resetsAt - now) / 1000)) };
  bucket.count += 1;
  return { limited: false, retryAfter: 0 };
}
