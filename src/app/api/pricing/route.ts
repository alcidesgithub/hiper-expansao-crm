import { NextResponse } from 'next/server';
import { AssociationPricing, UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { can } from '@/lib/permissions';

interface SessionUser {
    id?: string;
    role?: string;
    permissions?: string[];
}

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

function hasViewAccess(user?: SessionUser | null): boolean {
    return can(user, 'pricing:read');
}

function hasManageAccess(user?: SessionUser | null): boolean {
    return can(user, 'pricing:write');
}

function parseDate(value: string, fieldName: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`${fieldName} inválida`);
    }
    return parsed;
}

function serializePricing(table: AssociationPricing) {
    return {
        ...table,
        marketingMonthly: Number(table.marketingMonthly),
        adminMonthly: Number(table.adminMonthly),
        totalMonthly: Number(table.totalMonthly),
        effectiveDate: table.effectiveDate.toISOString(),
        expiryDate: table.expiryDate ? table.expiryDate.toISOString() : null,
        createdAt: table.createdAt.toISOString(),
        updatedAt: table.updatedAt.toISOString(),
    };
}

// GET /api/pricing
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all');

    try {
        if (all === 'true') {
            const session = await auth();
            const user = getSessionUser(session);
            if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
            if (!hasViewAccess(user)) {
                return NextResponse.json({ error: 'Sem permissão para visualizar tabelas de preços' }, { status: 403 });
            }

            const tables = await prisma.associationPricing.findMany({
                orderBy: [{ isActive: 'desc' }, { effectiveDate: 'desc' }],
            });

            return NextResponse.json({
                tables: tables.map(serializePricing),
                permissions: {
                    canManage: hasManageAccess(user),
                },
                currentUser: {
                    id: user.id || null,
                    role: user.role || null,
                },
            });
        }

        const activePricing = await prisma.associationPricing.findFirst({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                effectiveDate: true,
                marketingMonthly: true,
                marketingDescription: true,
                adminMonthly: true,
                adminDescription: true,
                totalMonthly: true,
            },
            orderBy: { effectiveDate: 'desc' },
        });

        if (!activePricing) {
            return NextResponse.json({ error: 'Nenhuma tabela de preços ativa encontrada' }, { status: 404 });
        }

        return NextResponse.json({
            ...activePricing,
            marketingMonthly: Number(activePricing.marketingMonthly),
            adminMonthly: Number(activePricing.adminMonthly),
            totalMonthly: Number(activePricing.totalMonthly),
            effectiveDate: activePricing.effectiveDate.toISOString(),
        });
    } catch (error) {
        console.error('Error fetching pricing:', error);
        return NextResponse.json({ error: 'Erro ao buscar preços' }, { status: 500 });
    }
}

// POST /api/pricing
export async function POST(request: Request) {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!hasManageAccess(user)) {
        return NextResponse.json({ error: 'Sem permissão para criar tabela de preços' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const parsed = pricingCreateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const effectiveDate = parseDate(parsed.data.effectiveDate, 'Data de vigência');
        const expiryDate = parsed.data.expiryDate ? parseDate(parsed.data.expiryDate, 'Data de expiração') : null;

        const created = await prisma.$transaction(async (tx) => {
            const activeCount = await tx.associationPricing.count({ where: { isActive: true } });
            const shouldActivate = parsed.data.isActive || activeCount === 0;

            if (shouldActivate) {
                await tx.associationPricing.updateMany({
                    where: { isActive: true },
                    data: { isActive: false },
                });
            }

            return tx.associationPricing.create({
                data: {
                    name: parsed.data.name,
                    effectiveDate,
                    expiryDate,
                    isActive: shouldActivate,
                    marketingMonthly: parsed.data.marketingMonthly,
                    marketingDescription: parsed.data.marketingDescription,
                    adminMonthly: parsed.data.adminMonthly,
                    adminDescription: parsed.data.adminDescription,
                    totalMonthly: parsed.data.marketingMonthly + parsed.data.adminMonthly,
                    createdBy: user.id || null,
                },
            });
        });

        return NextResponse.json(serializePricing(created), { status: 201 });
    } catch (error) {
        console.error('Error creating pricing:', error);
        if (error instanceof Error && error.message.includes('inválida')) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Erro ao criar tabela de preços' }, { status: 500 });
    }
}
