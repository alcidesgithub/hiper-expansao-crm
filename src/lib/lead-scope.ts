import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface LeadScopeUser {
    id?: string | null;
    role?: UserRole | null;
}

const PRIVILEGED_ROLES: readonly UserRole[] = ['ADMIN', 'DIRECTOR'];
const MANAGER_ROLE: UserRole = 'MANAGER';
const OWNERSHIP_ROLES: readonly UserRole[] = ['SDR', 'CONSULTANT'];

export function canReadAllLeads(role?: UserRole | null): boolean {
    return Boolean(role && PRIVILEGED_ROLES.includes(role));
}

export function isManagerRole(role?: UserRole | null): boolean {
    return role === MANAGER_ROLE;
}

export async function getManagerScopedUserIds(managerId: string): Promise<string[]> {
    const members = await prisma.teamMember.findMany({
        where: {
            team: { managerId },
        },
        select: { userId: true },
    });

    const scoped = new Set<string>(members.map((member) => member.userId));
    scoped.add(managerId);
    return Array.from(scoped);
}

export async function buildLeadScope(user: LeadScopeUser): Promise<Prisma.LeadWhereInput> {
    if (!user.id || !user.role) {
        return { id: '__no-access__' };
    }

    if (canReadAllLeads(user.role)) {
        return {};
    }

    if (isManagerRole(user.role)) {
        const scopedIds = await getManagerScopedUserIds(user.id);
        if (scopedIds.length === 0) {
            return { id: '__no-access__' };
        }
        return { assignedUserId: { in: scopedIds } };
    }

    if (OWNERSHIP_ROLES.includes(user.role)) {
        return { assignedUserId: user.id };
    }

    return { id: '__no-access__' };
}

export function mergeLeadWhere(
    base: Prisma.LeadWhereInput | undefined,
    scope: Prisma.LeadWhereInput
): Prisma.LeadWhereInput {
    if (!base || Object.keys(base).length === 0) {
        return scope;
    }
    if (Object.keys(scope).length === 0) {
        return base;
    }
    return { AND: [base, scope] };
}

export async function hasLeadAccess(leadId: string, user: LeadScopeUser): Promise<boolean> {
    const scope = await buildLeadScope(user);
    const lead = await prisma.lead.findFirst({
        where: mergeLeadWhere({ id: leadId }, scope),
        select: { id: true },
    });
    return Boolean(lead);
}
