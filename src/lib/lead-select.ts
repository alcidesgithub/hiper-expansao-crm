import { Prisma, UserRole } from '@prisma/client';
import { can } from '@/lib/permissions';

export function canReadSensitiveLeadFields(role?: UserRole | null): boolean {
    return can(role, 'leads:score:read');
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
    role?: UserRole | null;
    includeRelations?: boolean;
    includeSensitive?: boolean;
    includeQualificationData?: boolean;
    includeRoiData?: boolean;
} = {}): Prisma.LeadSelect {
    const {
        role,
        includeRelations = false,
        includeSensitive = false,
        includeQualificationData = false,
        includeRoiData = false,
    } = params;

    const select: Prisma.LeadSelect = buildLeadBaseSelect();
    const canReadSensitive = canReadSensitiveLeadFields(role);
    const canReadDeepSensitive = canReadSensitive && role !== 'CONSULTANT';

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
