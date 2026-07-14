// lib/rateLimit.ts
// Rate limiter in-memory. En Vercel serverless, las instancias son efímeras,
// así que esto es una salvaguarda "best effort" — no es una garantía de
// rate limit estricto. Para producción real, considera Upstash o similar.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();

// Limpieza periódica (cada 5 minutos) para no acumular memoria
// Solo corre en instancias long-lived, en serverless se limpia al final del request
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt < now) {
      buckets.delete(key);
    }
  }
}, 5 * 60 * 1000).unref?.();

export interface RateLimitConfig {
  windowMs: number; // ventana en ms
  maxRequests: number; // máximo de requests por ventana
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 10 * 60 * 1000, // 10 minutos
  maxRequests: 25, // 25 mensajes por 10 min por IP
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(identifier);

  if (!entry || entry.resetAt < now) {
    // Nueva ventana
    buckets.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

export function getClientIdentifier(req: {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string {
  // Prioridad: x-forwarded-for (Vercel lo setea) > x-real-ip > remoteAddress > "unknown"
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") {
    return xff.split(",")[0].trim();
  }
  if (Array.isArray(xff) && xff[0]) {
    return xff[0].split(",")[0].trim();
  }
  const xri = req.headers["x-real-ip"];
  if (typeof xri === "string") return xri;
  if (req.socket?.remoteAddress) return req.socket.remoteAddress;
  return "unknown";
}
