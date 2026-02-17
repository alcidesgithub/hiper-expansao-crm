import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { can } from '@/lib/permissions';

interface SessionUser {
    id?: string;
    role?: string;
    permissions?: string[];
}

const pricingPatchSchema = z.object({
    name: z.string().trim().min(2).optional(),
    effectiveDate: z.string().trim().min(1).optional(),
    expiryDate: z.string().trim().optional().nullable(),
    isActive: z.boolean().optional(),
    marketingMonthly: z.coerce.number().positive().optional(),
    marketingDescription: z.string().optional(),
    adminMonthly: z.coerce.number().positive().optional(),
    adminDescription: z.string().optional(),
});

function getSessionUser(session: unknown): SessionUser | null {
    if (!session || typeof session !== 'object') return null;
    const user = (session as { user?: SessionUser }).user;
    if (!user) return null;
    return {
        id: user.id,
        role: user.role,
        permissions: user.permissions
    };
}

function canView(user?: SessionUser | null): boolean {
    return can(user, 'pricing:read');
}

function canManage(user?: SessionUser | null): boolean {
    return can(user, 'pricing:write');
}

function parseDate(value: string, fieldName: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`${fieldName} inválida`);
    }
    return parsed;
}

// GET /api/pricing/[id]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!canView(user)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

    const { id } = await params;

    try {
        const pricing = await prisma.associationPricing.findUnique({ where: { id } });
        if (!pricing) return NextResponse.json({ error: 'Tabela não encontrada' }, { status: 404 });

        return NextResponse.json({
            ...pricing,
            marketingMonthly: Number(pricing.marketingMonthly),
            adminMonthly: Number(pricing.adminMonthly),
            totalMonthly: Number(pricing.totalMonthly),
            effectiveDate: pricing.effectiveDate.toISOString(),
            expiryDate: pricing.expiryDate ? pricing.expiryDate.toISOString() : null,
            createdAt: pricing.createdAt.toISOString(),
            updatedAt: pricing.updatedAt.toISOString(),
        });
    } catch (error) {
        console.error('Error fetching pricing:', error);
        return NextResponse.json({ error: 'Erro ao buscar tabela' }, { status: 500 });
    }
}

// PATCH /api/pricing/[id]
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!canManage(user)) return NextResponse.json({ error: 'Sem permissão para editar tabela' }, { status: 403 });

    const { id } = await params;

    try {
        const body = await request.json();
        const parsed = pricingPatchSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        if (Object.keys(parsed.data).length === 0) {
            return NextResponse.json({ error: 'Nenhuma alteração enviada' }, { status: 400 });
        }

        const current = await prisma.associationPricing.findUnique({ where: { id } });
        if (!current) return NextResponse.json({ error: 'Tabela não encontrada' }, { status: 404 });

        const updateData: Prisma.AssociationPricingUpdateInput = {};
        if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
        if (parsed.data.effectiveDate !== undefined) {
            updateData.effectiveDate = parseDate(parsed.data.effectiveDate, 'Data de vigência');
        }
        if (parsed.data.expiryDate !== undefined) {
            updateData.expiryDate = parsed.data.expiryDate ? parseDate(parsed.data.expiryDate, 'Data de expiração') : null;
        }
        if (parsed.data.marketingDescription !== undefined) updateData.marketingDescription = parsed.data.marketingDescription;
        if (parsed.data.adminDescription !== undefined) updateData.adminDescription = parsed.data.adminDescription;
        if (parsed.data.marketingMonthly !== undefined) updateData.marketingMonthly = parsed.data.marketingMonthly;
        if (parsed.data.adminMonthly !== undefined) updateData.adminMonthly = parsed.data.adminMonthly;

        const nextMarketing = parsed.data.marketingMonthly ?? Number(current.marketingMonthly);
        const nextAdmin = parsed.data.adminMonthly ?? Number(current.adminMonthly);
        updateData.totalMonthly = nextMarketing + nextAdmin;

        const nextIsActive = parsed.data.isActive;

        if (nextIsActive === false && current.isActive) {
            const otherActiveCount = await prisma.associationPricing.count({
                where: { isActive: true, id: { not: id } },
            });
            if (otherActiveCount === 0) {
                return NextResponse.json(
                    { error: 'Não é possível desativar a única tabela ativa' },
                    { status: 400 }
                );
            }
        }

        const updated = await prisma.$transaction(async (tx) => {
            if (nextIsActive === true) {
                await tx.associationPricing.updateMany({
                    where: { isActive: true, id: { not: id } },
                    data: { isActive: false },
                });
                updateData.isActive = true;
            } else if (nextIsActive === false) {
                updateData.isActive = false;
            }

            return tx.associationPricing.update({
                where: { id },
                data: updateData,
            });
        });

        return NextResponse.json({
            ...updated,
            marketingMonthly: Number(updated.marketingMonthly),
            adminMonthly: Number(updated.adminMonthly),
            totalMonthly: Number(updated.totalMonthly),
            effectiveDate: updated.effectiveDate.toISOString(),
            expiryDate: updated.expiryDate ? updated.expiryDate.toISOString() : null,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
        });
    } catch (error) {
        console.error('Error updating pricing:', error);
        if (error instanceof Error && error.message.includes('inválida')) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Erro ao atualizar tabela' }, { status: 500 });
    }
}

// DELETE /api/pricing/[id]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!canManage(user)) return NextResponse.json({ error: 'Sem permissão para excluir tabela' }, { status: 403 });

    const { id } = await params;

    try {
        const pricing = await prisma.associationPricing.findUnique({ where: { id } });
        if (!pricing) return NextResponse.json({ error: 'Tabela não encontrada' }, { status: 404 });

        if (pricing.isActive) {
            return NextResponse.json(
                { error: 'Não é possível excluir a tabela ativa. Ative outra tabela primeiro.' },
                { status: 400 }
            );
        }

        const totalCount = await prisma.associationPricing.count();
        if (totalCount <= 1) {
            return NextResponse.json(
                { error: 'Não é possível excluir a única tabela cadastrada' },
                { status: 400 }
            );
        }

        await prisma.associationPricing.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting pricing:', error);
        return NextResponse.json({ error: 'Erro ao excluir tabela' }, { status: 500 });
    }
}
