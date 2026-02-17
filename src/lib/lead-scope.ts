import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { can } from './permissions';

export interface LeadScopeUser {
    id?: string | null;
    role?: string | null; // Changed to string to match session/permissions
    permissions?: string[] | null;
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
    const result = Array.from(scoped);
    console.log('[LeadScope] Manager scoped IDs:', result);
    return result;
}

export async function buildLeadScope(user: LeadScopeUser): Promise<Prisma.LeadWhereInput> {
    console.log('[LeadScope] Building scope for user:', { id: user.id, role: user.role, permCount: user.permissions?.length || 0 });
    if (!user.id) {
        return { id: '__no-access__' };
    }

    // 1. Can read all leads? (Admin/Director)
    if (can(user, 'leads:read:all')) {
        console.log('[LeadScope] User has leads:read:all, returning full scope');
        return {};
    }

    // 2. Can read team leads? (Manager)
    if (can(user, 'leads:read:team')) {
        const scopedIds = await getManagerScopedUserIds(user.id);
        if (scopedIds.length === 0) {
            // Even if manager has no team, they should see their own leads?
            // Usually managers also have leads assigned to them.
            // If scopedIds is empty (impossible because we add managerId), it means managerId is there.
            return { assignedUserId: user.id };
        }
        return { assignedUserId: { in: scopedIds } };
    }

    // 3. Can read own leads? (Consultant)
    if (can(user, 'leads:read:own')) {
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
