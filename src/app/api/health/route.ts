import Redis from 'ioredis';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type ServiceState = 'ok' | 'degraded' | 'down';

interface ServiceHealth {
    status: ServiceState;
    latencyMs: number | null;
    error?: string;
}

const HEALTH_TIMEOUT_MS = 1500;

function asErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Unknown error';
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
    });
}

async function checkDatabase(): Promise<ServiceHealth> {
    const startedAt = Date.now();
    try {
        await withTimeout(prisma.$queryRaw`SELECT 1`, HEALTH_TIMEOUT_MS, 'database');
        return {
            status: 'ok',
            latencyMs: Date.now() - startedAt,
        };
    } catch (error) {
        return {
            status: 'down',
            latencyMs: Date.now() - startedAt,
            error: asErrorMessage(error),
        };
    }
}

async function checkRedis(): Promise<ServiceHealth> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        return {
            status: 'degraded',
            latencyMs: null,
            error: 'REDIS_URL not configured',
        };
    }

    const startedAt = Date.now();
    let client: Redis | null = null;
    try {
        client = new Redis(redisUrl, {
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            lazyConnect: true,
        });
        await withTimeout(client.connect(), HEALTH_TIMEOUT_MS, 'redis-connect');
        await withTimeout(client.ping(), HEALTH_TIMEOUT_MS, 'redis');
        return {
            status: 'ok',
            latencyMs: Date.now() - startedAt,
        };
    } catch (error) {
        return {
            status: 'down',
            latencyMs: Date.now() - startedAt,
            error: asErrorMessage(error),
        };
    } finally {
        if (client) client.disconnect();
    }
}

function resolveOverallStatus(services: ServiceHealth[]): ServiceState {
    if (services.some((service) => service.status === 'down')) return 'down';
    if (services.some((service) => service.status === 'degraded')) return 'degraded';
    return 'ok';
}

function readBearerToken(request: Request): string | null {
    const authorization = request.headers.get('authorization');
    if (!authorization) return null;
    const [scheme, token] = authorization.split(' ');
    if (!scheme || !token) return null;
    if (scheme.toLowerCase() !== 'bearer') return null;
    return token.trim();
}

function canReadDetailedHealth(request: Request): boolean {
    const expectedToken = process.env.HEALTHCHECK_TOKEN?.trim();
    if (!expectedToken) {
        return process.env.NODE_ENV !== 'production';
    }

    const providedToken = readBearerToken(request);
    if (!providedToken) return false;

    const expectedBuffer = Buffer.from(expectedToken);
    const providedBuffer = Buffer.from(providedToken);
    if (expectedBuffer.length !== providedBuffer.length) return false;

    return timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function GET(request: Request) {
    const startedAt = Date.now();
    const [database, redis] = await Promise.all([
        checkDatabase(),
        checkRedis(),
    ]);

    const status = resolveOverallStatus([database, redis]);
    const payloadBase = {
        status,
        timestamp: new Date().toISOString(),
        uptimeSec: Math.round(process.uptime()),
        responseTimeMs: Date.now() - startedAt,
    };

    if (!canReadDetailedHealth(request)) {
        return NextResponse.json(payloadBase, { status: status === 'down' ? 503 : 200 });
    }

    return NextResponse.json({
        ...payloadBase,
        services: {
            database,
            redis,
        },
    }, { status: status === 'down' ? 503 : 200 });
}
