import { NextResponse } from 'next/server';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { userCreateSchema } from '@/lib/validation';
import { logAudit } from '@/lib/audit';
import { can } from '@/lib/permissions';
const ALLOWED_ROLES: readonly UserRole[] = ['ADMIN', 'DIRECTOR', 'MANAGER', 'CONSULTANT'];
const ALLOWED_STATUS: readonly UserStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

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

function canViewUsers(user?: SessionUser | null): boolean {
    return can(user, 'users:manage');
}

function canManageUsers(user?: SessionUser | null): boolean {
    return can(user, 'users:manage');
}

function parseStatus(value: string | null): UserStatus | null {
    return value && ALLOWED_STATUS.includes(value as UserStatus) ? (value as UserStatus) : null;
}

function parseRole(value: string | null): UserRole | null {
    return value && ALLOWED_ROLES.includes(value as UserRole) ? (value as UserRole) : null;
}

// GET /api/users - List users for dropdowns or management screen
export async function GET(request: Request) {
    const rawSession = await auth();
    const user = getSessionUser(rawSession);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const context = searchParams.get('context');

    if (context !== 'management') {
        const users = await prisma.user.findMany({
            where: { status: 'ACTIVE' },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
                phone: true,
            },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(users);
    }

    if (!canViewUsers(user)) {
        return NextResponse.json({ error: 'Sem permissão para visualizar usuários' }, { status: 403 });
    }

    const search = searchParams.get('search');
    const status = parseStatus(searchParams.get('status'));
    const role = parseRole(searchParams.get('role'));
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);

    const where: Prisma.UserWhereInput = {};
    if (status) where.status = status;
    if (role) where.role = role;
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { department: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
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
            orderBy: [{ status: 'asc' }, { name: 'asc' }],
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.user.count({ where }),
    ]);

    return NextResponse.json({
        users,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(Math.ceil(total / limit), 1),
        },
        permissions: {
            canManage: canManageUsers(user),
            canCreate: canManageUsers(user),
        },
        currentUser: {
            id: user.id || null,
            role: user.role || null,
        },
    });
}

// POST /api/users - Create user
export async function POST(request: Request) {
    const rawSession = await auth();
    const user = getSessionUser(rawSession);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!canManageUsers(user)) {
        return NextResponse.json({ error: 'Sem permissão para criar usuários' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const parsed = userCreateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const email = parsed.data.email.toLowerCase().trim();

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'Já existe usuário com este e-mail' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
        const created = await prisma.user.create({
            data: {
                name: parsed.data.name.trim(),
                email,
                role: parsed.data.role,
                status: parsed.data.status,
                department: parsed.data.department?.trim() || null,
                phone: parsed.data.phone?.trim() || null,
                password: hashedPassword,
            },
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
            action: 'CREATE',
            entity: 'User',
            entityId: created.id,
            changes: { email: created.email, role: created.role, status: created.status },
        });

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
    }
}
