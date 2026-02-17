import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { taskCreateSchema, taskUpdateSchema } from '@/lib/validation';
import { hasLeadAccess } from '@/lib/lead-scope';
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

type AuthHandler = typeof auth;
let authHandler: AuthHandler = auth;

export function __setAuthHandlerForTests(handler: AuthHandler): void {
    authHandler = handler;
}

export function __resetAuthHandlerForTests(): void {
    authHandler = auth;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const canAccess = await hasLeadAccess(id, user);
    if (!canAccess) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

    try {
        const tasks = await prisma.task.findMany({
            where: { leadId: id },
            include: { user: { select: { id: true, name: true } } },
            orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        });
        return NextResponse.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return NextResponse.json({ error: 'Erro ao buscar tarefas' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await authHandler();
    const user = getSessionUser(session);
    const userId = user?.id || null;
    if (!user || !userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!can(user, 'leads:write:own')) return NextResponse.json({ error: 'Sem permissão para editar lead' }, { status: 403 });

    const { id } = await params;
    const canAccess = await hasLeadAccess(id, user);
    if (!canAccess) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

    try {
        const body = await request.json();
        const parsed = taskCreateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const task = await prisma.task.create({
            data: {
                leadId: id,
                userId,
                title: parsed.data.title,
                description: parsed.data.description || null,
                priority: parsed.data.priority,
                dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
            },
            include: { user: { select: { id: true, name: true } } },
        });

        await prisma.activity.create({
            data: {
                leadId: id,
                type: 'TASK',
                title: 'Tarefa criada',
                description: parsed.data.title,
                userId,
            },
        });

        return NextResponse.json(task, { status: 201 });
    } catch (error) {
        console.error('Error creating task:', error);
        return NextResponse.json({ error: 'Erro ao criar tarefa' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await authHandler();
    const user = getSessionUser(session);
    const userId = user?.id || null;
    if (!user || !userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!can(user, 'leads:write:own')) return NextResponse.json({ error: 'Sem permissão para editar lead' }, { status: 403 });

    const { id } = await params;
    const canAccess = await hasLeadAccess(id, user);
    if (!canAccess) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ error: 'Parâmetro taskId é obrigatório' }, { status: 400 });

    try {
        const body = await request.json();
        const parsed = taskUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const existing = await prisma.task.findFirst({
            where: { id: taskId, leadId: id },
            select: { id: true, status: true, title: true },
        });
        if (!existing) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });

        const nextStatus = parsed.data.status || existing.status;

        const updated = await prisma.task.update({
            where: { id: taskId },
            data: {
                ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
                ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
                ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
                ...(parsed.data.dueDate !== undefined ? { dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null } : {}),
                ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
                ...(parsed.data.status !== undefined ? { completedAt: nextStatus === 'COMPLETED' ? new Date() : null } : {}),
            },
            include: { user: { select: { id: true, name: true } } },
        });

        if (existing.status !== nextStatus || parsed.data.title !== undefined) {
            await prisma.activity.create({
                data: {
                    leadId: id,
                    type: 'TASK',
                    title: existing.status !== nextStatus ? 'Status da tarefa alterado' : 'Tarefa atualizada',
                    description: `${existing.title} (${existing.status} -> ${nextStatus})`,
                    userId,
                },
            });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating task:', error);
        return NextResponse.json({ error: 'Erro ao atualizar tarefa' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await authHandler();
    const user = getSessionUser(session);
    const userId = user?.id || null;
    if (!user || !userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!can(user, 'leads:write:own')) return NextResponse.json({ error: 'Sem permissão para editar lead' }, { status: 403 });

    const { id } = await params;
    const canAccess = await hasLeadAccess(id, user);
    if (!canAccess) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ error: 'Parâmetro taskId é obrigatório' }, { status: 400 });

    try {
        const existing = await prisma.task.findFirst({ where: { id: taskId, leadId: id }, select: { id: true, title: true, status: true } });
        if (!existing) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });

        const cancelled = await prisma.task.update({
            where: { id: taskId },
            data: { status: 'CANCELLED', completedAt: null },
            include: { user: { select: { id: true, name: true } } },
        });

        if (existing.status !== 'CANCELLED') {
            await prisma.activity.create({
                data: {
                    leadId: id,
                    type: 'TASK',
                    title: 'Tarefa cancelada',
                    description: existing.title,
                    userId,
                },
            });
        }

        return NextResponse.json(cancelled);
    } catch (error) {
        console.error('Error cancelling task:', error);
        return NextResponse.json({ error: 'Erro ao cancelar tarefa' }, { status: 500 });
    }
}
