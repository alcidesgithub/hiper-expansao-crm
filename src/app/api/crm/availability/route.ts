import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { parseTimeToMinutes } from '@/lib/availability';
import { can } from '@/lib/permissions';

interface SessionUser {
    id?: string;
    role?: string;
    permissions?: string[];
}

type AuthHandler = typeof auth;
let authHandler: AuthHandler = auth;

export function __setAuthHandlerForTests(handler: AuthHandler): void {
    authHandler = handler;
}

export function __resetAuthHandlerForTests(): void {
    authHandler = auth;
}

const slotSchema = z.object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horario invalido'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horario invalido'),
    isActive: z.boolean().optional().default(true),
});

const blockSchema = z.object({
    startDate: z.string().datetime({ message: 'Data inicial invalida' }),
    endDate: z.string().datetime({ message: 'Data final invalida' }),
    reason: z.string().max(200).optional().nullable(),
});

const updateAvailabilitySchema = z.object({
    userId: z.string().optional(),
    slots: z.array(slotSchema).max(80).default([]),
    blocks: z.array(blockSchema).max(200).default([]),
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

function canManageAvailability(user?: SessionUser | null): boolean {
    return can(user, 'availability:manage');
}

function canManageOthers(role?: UserRole): boolean {
    return role === 'ADMIN';
}

function validateSlotIntervals(
    slots: Array<z.infer<typeof slotSchema>>
): string | null {
    const activeByDay = new Map<number, Array<{ startMinutes: number; endMinutes: number }>>();

    for (const slot of slots) {
        const startMinutes = parseTimeToMinutes(slot.startTime);
        const endMinutes = parseTimeToMinutes(slot.endTime);
        if (startMinutes === null || endMinutes === null) {
            return 'Horario invalido nos slots';
        }
        if (startMinutes >= endMinutes) {
            return 'Horario inicial deve ser menor que horario final';
        }

        if (!slot.isActive) continue;
        const current = activeByDay.get(slot.dayOfWeek) || [];
        current.push({ startMinutes, endMinutes });
        activeByDay.set(slot.dayOfWeek, current);
    }

    for (const [, intervals] of activeByDay) {
        intervals.sort((a, b) => a.startMinutes - b.startMinutes);
        for (let i = 1; i < intervals.length; i++) {
            const prev = intervals[i - 1];
            const curr = intervals[i];
            if (curr.startMinutes < prev.endMinutes) {
                return 'Existem slots sobrepostos no mesmo dia';
            }
        }
    }

    return null;
}

function validateBlocks(blocks: Array<z.infer<typeof blockSchema>>): string | null {
    for (const block of blocks) {
        const startDate = new Date(block.startDate);
        const endDate = new Date(block.endDate);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            return 'Datas de bloqueio invalidas';
        }
        if (startDate >= endDate) {
            return 'Data inicial do bloqueio deve ser menor que a final';
        }
    }
    return null;
}

async function resolveTargetUserId(actor: SessionUser, requestedUserId?: string): Promise<string | null> {
    if (!actor.id || !actor.role) return null;
    if (!requestedUserId || requestedUserId === actor.id) return actor.id;
    if (!canManageOthers(actor.role)) return actor.id;
    return requestedUserId;
}

async function ensureTargetUserCanHaveAvailability(targetUserId: string, actorUserId: string): Promise<boolean> {
    const target = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, role: true },
    });
    if (!target) return false;
    if (target.id === actorUserId) return true;
    return target.role === 'CONSULTANT';
}

async function loadAvailabilityPayload(targetUserId: string, includeConsultants: boolean) {
    const [slots, blocks, consultants] = await Promise.all([
        prisma.availabilitySlot.findMany({
            where: { userId: targetUserId },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        }),
        prisma.availabilityBlock.findMany({
            where: { userId: targetUserId },
            orderBy: { startDate: 'asc' },
        }),
        includeConsultants
            ? prisma.user.findMany({
                where: {
                    status: 'ACTIVE',
                    role: { in: ['CONSULTANT'] },
                },
                select: { id: true, name: true, role: true },
                orderBy: { name: 'asc' },
            })
            : Promise.resolve([] as Array<{ id: string; name: string; role: UserRole }>),
    ]);

    return {
        userId: targetUserId,
        slots: slots.map((slot) => ({
            id: slot.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isActive: slot.isActive,
            createdAt: slot.createdAt.toISOString(),
            updatedAt: slot.updatedAt.toISOString(),
        })),
        blocks: blocks.map((block) => ({
            id: block.id,
            startDate: block.startDate.toISOString(),
            endDate: block.endDate.toISOString(),
            reason: block.reason,
            createdAt: block.createdAt.toISOString(),
            updatedAt: block.updatedAt.toISOString(),
        })),
        consultants,
    };
}

// GET /api/crm/availability
export async function GET(request: Request) {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user?.id || !user.role) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    if (!canManageAvailability(user)) {
        return NextResponse.json({ error: 'Sem permissao para gerenciar disponibilidade' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId') || undefined;
    const targetUserId = await resolveTargetUserId(user, requestedUserId);
    if (!targetUserId) return NextResponse.json({ error: 'Usuario invalido' }, { status: 400 });
    if (!await ensureTargetUserCanHaveAvailability(targetUserId, user.id)) {
        return NextResponse.json({ error: 'Usuario alvo invalido para disponibilidade' }, { status: 400 });
    }

    const payload = await loadAvailabilityPayload(targetUserId, canManageOthers(user.role));
    return NextResponse.json({
        ...payload,
        permissions: {
            canManageOthers: canManageOthers(user.role),
        },
    });
}

// PUT /api/crm/availability
export async function PUT(request: Request) {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user?.id || !user.role) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    if (!canManageAvailability(user)) {
        return NextResponse.json({ error: 'Sem permissao para gerenciar disponibilidade' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const parsed = updateAvailabilitySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Dados invalidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const targetUserId = await resolveTargetUserId(user, parsed.data.userId);
        if (!targetUserId) return NextResponse.json({ error: 'Usuario invalido' }, { status: 400 });
        if (!await ensureTargetUserCanHaveAvailability(targetUserId, user.id)) {
            return NextResponse.json({ error: 'Usuario alvo invalido para disponibilidade' }, { status: 400 });
        }

        const slotValidationError = validateSlotIntervals(parsed.data.slots);
        if (slotValidationError) {
            return NextResponse.json({ error: slotValidationError }, { status: 400 });
        }

        const blockValidationError = validateBlocks(parsed.data.blocks);
        if (blockValidationError) {
            return NextResponse.json({ error: blockValidationError }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.availabilitySlot.deleteMany({ where: { userId: targetUserId } });
            await tx.availabilityBlock.deleteMany({ where: { userId: targetUserId } });

            if (parsed.data.slots.length > 0) {
                await tx.availabilitySlot.createMany({
                    data: parsed.data.slots.map((slot) => ({
                        userId: targetUserId,
                        dayOfWeek: slot.dayOfWeek,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        isActive: slot.isActive ?? true,
                    })),
                });
            }

            if (parsed.data.blocks.length > 0) {
                await tx.availabilityBlock.createMany({
                    data: parsed.data.blocks.map((block) => ({
                        userId: targetUserId,
                        startDate: new Date(block.startDate),
                        endDate: new Date(block.endDate),
                        reason: block.reason || null,
                    })),
                });
            }
        });

        const payload = await loadAvailabilityPayload(targetUserId, canManageOthers(user.role));
        return NextResponse.json({
            ...payload,
            permissions: {
                canManageOthers: canManageOthers(user.role),
            },
        });
    } catch (error) {
        console.error('Error updating availability:', error);
        return NextResponse.json({ error: 'Erro ao atualizar disponibilidade' }, { status: 500 });
    }
}
