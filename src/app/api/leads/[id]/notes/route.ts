import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { noteCreateSchema } from '@/lib/validation';
import { hasLeadAccess } from '@/lib/lead-scope';
import { can } from '@/lib/permissions';

const noteUpdateSchema = z.object({
    content: z.string().min(1).optional(),
    isPinned: z.boolean().optional(),
}).refine((value) => value.content !== undefined || value.isPinned !== undefined, {
    message: 'Nenhum campo para atualizar',
});

interface SessionUser {
    id?: string;
    role?: UserRole;
}

function getSessionUser(session: unknown): SessionUser | null {
    if (!session || typeof session !== 'object') return null;
    return (session as { user?: SessionUser }).user || null;
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
        const notes = await prisma.note.findMany({
            where: { leadId: id },
            include: { user: { select: { id: true, name: true } } },
            orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        });
        return NextResponse.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        return NextResponse.json({ error: 'Erro ao buscar notas' }, { status: 500 });
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
    if (!can(user.role, 'leads:write:own')) return NextResponse.json({ error: 'Sem permissão para editar lead' }, { status: 403 });

    const { id } = await params;
    const canAccess = await hasLeadAccess(id, user);
    if (!canAccess) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

    try {
        const body = await request.json();
        const parsed = noteCreateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const note = await prisma.note.create({
            data: {
                leadId: id,
                userId,
                content: parsed.data.content,
                isPinned: parsed.data.isPinned,
            },
            include: { user: { select: { id: true, name: true } } },
        });

        await prisma.activity.create({
            data: {
                leadId: id,
                type: 'NOTE',
                title: 'Nota adicionada',
                description: parsed.data.content.substring(0, 100),
                userId,
            },
        });

        return NextResponse.json(note, { status: 201 });
    } catch (error) {
        console.error('Error creating note:', error);
        return NextResponse.json({ error: 'Erro ao criar nota' }, { status: 500 });
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
    if (!can(user.role, 'leads:write:own')) return NextResponse.json({ error: 'Sem permissão para editar lead' }, { status: 403 });

    const { id } = await params;
    const canAccess = await hasLeadAccess(id, user);
    if (!canAccess) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) return NextResponse.json({ error: 'Parâmetro noteId é obrigatório' }, { status: 400 });

    try {
        const body = await request.json();
        const parsed = noteUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const existing = await prisma.note.findFirst({ where: { id: noteId, leadId: id }, select: { id: true } });
        if (!existing) return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 });

        const updated = await prisma.note.update({
            where: { id: noteId },
            data: {
                ...(parsed.data.content !== undefined ? { content: parsed.data.content } : {}),
                ...(parsed.data.isPinned !== undefined ? { isPinned: parsed.data.isPinned } : {}),
            },
            include: { user: { select: { id: true, name: true } } },
        });

        await prisma.activity.create({
            data: {
                leadId: id,
                type: 'NOTE',
                title: parsed.data.isPinned !== undefined ? (parsed.data.isPinned ? 'Nota fixada' : 'Nota desafixada') : 'Nota editada',
                description: parsed.data.content ? parsed.data.content.substring(0, 100) : null,
                userId,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating note:', error);
        return NextResponse.json({ error: 'Erro ao atualizar nota' }, { status: 500 });
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
    if (!can(user.role, 'leads:write:own')) return NextResponse.json({ error: 'Sem permissão para editar lead' }, { status: 403 });

    const { id } = await params;
    const canAccess = await hasLeadAccess(id, user);
    if (!canAccess) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) return NextResponse.json({ error: 'Parâmetro noteId é obrigatório' }, { status: 400 });

    try {
        const existing = await prisma.note.findFirst({ where: { id: noteId, leadId: id }, select: { id: true } });
        if (!existing) return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 });

        await prisma.note.delete({ where: { id: noteId } });

        await prisma.activity.create({
            data: {
                leadId: id,
                type: 'NOTE',
                title: 'Nota removida',
                userId,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting note:', error);
        return NextResponse.json({ error: 'Erro ao remover nota' }, { status: 500 });
    }
}
