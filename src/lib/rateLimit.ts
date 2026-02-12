import Redis from 'ioredis';

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const store = new Map<string, RateLimitEntry>();
const REDIS_PREFIX = 'ratelimit:';

let redisClient: Redis | null = null;
let redisInitFailed = false;

function getRedisClient(): Redis | null {
    if (redisInitFailed) return null;
    if (redisClient) return redisClient;
    if (!process.env.REDIS_URL) return null;

    try {
        redisClient = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            lazyConnect: true,
        });
        redisClient.on('error', (error) => {
            console.error('[RateLimit] Redis error:', error);
        });
        return redisClient;
    } catch (error) {
        redisInitFailed = true;
        console.error('[RateLimit] Failed to initialize Redis client:', error);
        return null;
    }
}

// Clean up stale entries every 5 minutes
const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (now > entry.resetTime) {
            store.delete(key);
        }
    }
}, 5 * 60 * 1000);
cleanupTimer.unref?.();

interface RateLimitOptions {
    /** Max requests allowed in the window */
    limit: number;
    /** Window duration in seconds */
    windowSec: number;
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetIn: number; // seconds until reset
}

function rateLimitInMemory(
    key: string,
    options: RateLimitOptions = { limit: 10, windowSec: 60 }
): RateLimitResult {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetTime) {
        // New window
        store.set(key, {
            count: 1,
            resetTime: now + options.windowSec * 1000,
        });
        return { allowed: true, remaining: options.limit - 1, resetIn: options.windowSec };
    }

    if (entry.count >= options.limit) {
        return {
            allowed: false,
            remaining: 0,
            resetIn: Math.ceil((entry.resetTime - now) / 1000),
        };
    }

    entry.count++;
    return {
        allowed: true,
        remaining: options.limit - entry.count,
        resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
}

export async function rateLimit(
    key: string,
    options: RateLimitOptions = { limit: 10, windowSec: 60 }
): Promise<RateLimitResult> {
    const redis = getRedisClient();
    if (!redis) {
        return rateLimitInMemory(key, options);
    }

    const redisKey = `${REDIS_PREFIX}${key}`;
    const script = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
return {current, ttl}
`;

    try {
        const response = await redis.eval(
            script,
            1,
            redisKey,
            options.windowSec.toString()
        ) as [number, number];

        const count = Number(response[0] || 0);
        const ttl = Math.max(0, Number(response[1] || options.windowSec));

        if (count > options.limit) {
            return {
                allowed: false,
                remaining: 0,
                resetIn: ttl,
            };
        }

        return {
            allowed: true,
            remaining: Math.max(0, options.limit - count),
            resetIn: ttl,
        };
    } catch (error) {
        console.error('[RateLimit] Redis request failed, falling back to memory:', error);
        return rateLimitInMemory(key, options);
    }
}

/**
 * Get IP address from request headers.
 * Works with Cloudflare, Vercel, and standard proxies.
 */
export function getClientIp(request: Request): string {
    const headers = new Headers(request.headers);
    return (
        headers.get('cf-connecting-ip') ||
        headers.get('x-real-ip') ||
        headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        'unknown'
    );
}
