import { Prisma } from '@prisma/client';
import { can, PermissionUser } from '@/lib/permissions';

export function canReadSensitiveLeadFields(user?: PermissionUser | null): boolean {
    return can(user, 'leads:score:read');
}

export function buildLeadBaseSelect(): Prisma.LeadSelect {
    return {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        status: true,
        priority: true,
        source: true,
        createdAt: true,
        updatedAt: true,
        assignedUserId: true,
        pipelineStageId: true,
    };
}

export function buildLeadSelect(params: {
    user?: PermissionUser | null;
    includeRelations?: boolean;
    includeSensitive?: boolean;
    includeQualificationData?: boolean;
    includeRoiData?: boolean;
} = {}): Prisma.LeadSelect {
    const {
        user,
        includeRelations = false,
        includeSensitive = false,
        includeQualificationData = false,
        includeRoiData = false,
    } = params;

    const select: Prisma.LeadSelect = buildLeadBaseSelect();
    const canReadSensitive = canReadSensitiveLeadFields(user);
    const canReadDeepSensitive = canReadSensitive && user?.role !== 'CONSULTANT';
    // Optimization: Consultant might have score:read but maybe not deep data?
    // Actually, let's rely on permissions if possible.
    // 'leads:score:read' is the permission.
    // Use strictly permission if possible?
    // The original code had `&& role !== 'CONSULTANT'`.
    // Let's keep it if there isn't a specific permission for deep data.
    // Or adds 'leads:deep-sensitive:read'?
    // For now, keep the role check as an extra guard or refactor later. 
    // But `user.role` is string now.

    if (includeRelations) {
        select.assignedUser = { select: { id: true, name: true } };
        select.pipelineStage = {
            select: { id: true, name: true, color: true, order: true, isWon: true, isLost: true },
        };
    }

    if (includeSensitive && canReadSensitive) {
        select.score = true;
        select.grade = true;
    }

    if (includeQualificationData && canReadDeepSensitive) {
        select.qualificationData = true;
    }

    if (includeRoiData && canReadDeepSensitive) {
        select.roiData = true;
    }

    return select;
}

