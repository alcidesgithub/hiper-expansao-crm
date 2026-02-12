'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface AuditLogParams {
    userId?: string;
    action: string;
    entity: string;
    entityId: string;
    changes?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}

export async function logAudit(params: AuditLogParams): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                userId: params.userId || null,
                action: params.action,
                entity: params.entity,
                entityId: params.entityId,
                changes: params.changes
                    ? (params.changes as Prisma.InputJsonValue)
                    : Prisma.DbNull,
                ipAddress: params.ipAddress || null,
                userAgent: params.userAgent || null,
            },
        });
    } catch (error) {
        // Audit log failure should not break the main flow
        console.error('[AuditLog] Failed to write audit log:', error);
    }
}
