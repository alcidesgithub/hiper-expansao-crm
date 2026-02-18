import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { can } from './permissions';

export interface LeadScopeUser {
    id?: string | null;
    role?: string | null; // Changed to string to match session/permissions
    permissions?: string[] | null;
}

export async function buildLeadScope(user: LeadScopeUser): Promise<Prisma.LeadWhereInput> {
    if (!user.id) {
        return { id: '__no-access__' };
    }

    // 1. Can read all leads? (Admin/Director/Manager)
    if (can(user, 'leads:read:all')) {
        return {};
    }

    // 2. Can read own leads? (Consultant)
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
