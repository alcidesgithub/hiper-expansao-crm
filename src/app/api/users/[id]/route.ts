import { NextResponse } from 'next/server';
import { Prisma, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { userUpdateSchema } from '@/lib/validation';
import { logAudit } from '@/lib/audit';
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

function canManageUsers(user?: SessionUser | null): boolean {
    return can(user, 'users:manage');
}

async function hasAnotherActiveAdmin(excludedUserId: string): Promise<boolean> {
    const count = await prisma.user.count({
        where: {
            id: { not: excludedUserId },
            role: 'ADMIN',
            status: 'ACTIVE',
        },
    });
    return count > 0;
}

// PATCH /api/users/[id] - Update user profile, role, status and optional password
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const rawSession = await auth();
    const user = getSessionUser(rawSession);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const isSelf = user.id === id;

    if (!canManageUsers(user) && !isSelf) {
        return NextResponse.json({ error: 'Sem permissão para editar usuários' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const parsed = userUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const data = parsed.data;
        const updateData: Prisma.UserUpdateInput = {};
        if (data.name !== undefined) updateData.name = data.name.trim();
        if (data.email !== undefined) updateData.email = data.email.trim().toLowerCase();
        if (data.role !== undefined && !canManageUsers(user)) {
            return NextResponse.json({ error: 'Sem permissão para alterar cargos' }, { status: 403 });
        }
        if (data.status !== undefined && !canManageUsers(user)) {
            return NextResponse.json({ error: 'Sem permissão para alterar status' }, { status: 403 });
        }

        if (data.role !== undefined) updateData.role = data.role;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.department !== undefined) updateData.department = data.department?.trim() || null;
        if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
        if (data.password !== undefined) updateData.password = await bcrypt.hash(data.password, 10);

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'Nenhuma alteração enviada' }, { status: 400 });
        }

        const existing = await prisma.user.findUnique({
            where: { id },
            select: { id: true, email: true, role: true, status: true },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        const nextEmail = updateData.email as string | undefined;
        if (nextEmail && nextEmail !== existing.email) {
            const duplicate = await prisma.user.findUnique({ where: { email: nextEmail } });
            if (duplicate) {
                return NextResponse.json({ error: 'Já existe usuário com este e-mail' }, { status: 409 });
            }
        }

        const nextRole = (updateData.role as UserRole | undefined) ?? existing.role;
        const nextStatus = (updateData.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | undefined) ?? existing.status;
        const isDemotingOrDisablingAdmin = existing.role === 'ADMIN' && (nextRole !== 'ADMIN' || nextStatus !== 'ACTIVE');
        if (isDemotingOrDisablingAdmin) {
            const canProceed = await hasAnotherActiveAdmin(existing.id);
            if (!canProceed) {
                return NextResponse.json(
                    { error: 'Não é possível remover o último administrador ativo' },
                    { status: 400 }
                );
            }
        }

        if (user.id && user.id === id && updateData.status && updateData.status !== 'ACTIVE') {
            return NextResponse.json(
                { error: 'Você não pode desativar o próprio usuário' },
                { status: 400 }
            );
        }

        const updated = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                department: true,
                phone: true,
                createdAt: true,
                lastLoginAt: true,
            },
        });

        await logAudit({
            userId: user.id || undefined,
            action: 'UPDATE',
            entity: 'User',
            entityId: id,
            changes: {
                name: data.name,
                email: data.email,
                role: data.role,
                status: data.status,
                department: data.department,
                phone: data.phone,
                passwordUpdated: data.password !== undefined,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 });
    }
}

// DELETE /api/users/[id] - Hard delete user
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const rawSession = await auth();
    const user = getSessionUser(rawSession);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!canManageUsers(user)) {
        return NextResponse.json({ error: 'Sem permissão para excluir usuários' }, { status: 403 });
    }

    const { id } = await params;

    try {
        const existing = await prisma.user.findUnique({
            where: { id },
            select: { id: true, role: true, status: true },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        if (user.id && user.id === id) {
            return NextResponse.json(
                { error: 'Você não pode excluir o próprio usuário' },
                { status: 400 }
            );
        }

        if (existing.role === 'ADMIN') {
            const canProceed = await hasAnotherActiveAdmin(existing.id);
            if (!canProceed) {
                return NextResponse.json(
                    { error: 'Não é possível excluir o último administrador ativo' },
                    { status: 400 }
                );
            }
        }

        // Tentar excluir fisicamente
        const deleted = await prisma.user.delete({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
        });

        await logAudit({
            userId: user.id || undefined,
            action: 'DELETE',
            entity: 'User',
            entityId: id,
            changes: {
                deletedUser: {
                    name: deleted.name,
                    email: deleted.email,
                    role: deleted.role
                }
            },
        });

        return NextResponse.json(deleted);
    } catch (error) {
        console.error('Error deleting user:', error);

        // Verificar erro de chave estrangeira (P2003 no Prisma)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            return NextResponse.json({
                error: 'Não é possível excluir este usuário pois ele possui registros vinculados (leads, atividades, etc). Considere inativá-lo.',
                code: 'CONSTRAINT_VIOLATION'
            }, { status: 409 });
        }

        return NextResponse.json({ error: 'Erro ao excluir usuário' }, { status: 500 });
    }
}
