import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { logAudit } from '@/lib/audit';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { hasLeadAccess } from '@/lib/lead-scope';
import { can } from '@/lib/permissions';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

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
type MkdirHandler = typeof mkdir;
type WriteFileHandler = typeof writeFile;
let mkdirHandler: MkdirHandler = mkdir;
let writeFileHandler: WriteFileHandler = writeFile;

export function __setAuthHandlerForTests(handler: AuthHandler): void {
    authHandler = handler;
}

export function __resetAuthHandlerForTests(): void {
    authHandler = auth;
}

export function __setUploadFsHandlersForTests(handlers: {
    mkdir?: MkdirHandler;
    writeFile?: WriteFileHandler;
}): void {
    if (handlers.mkdir) mkdirHandler = handlers.mkdir;
    if (handlers.writeFile) writeFileHandler = handlers.writeFile;
}

export function __resetUploadFsHandlersForTests(): void {
    mkdirHandler = mkdir;
    writeFileHandler = writeFile;
}

// POST /api/upload - Upload a file
export async function POST(request: Request) {
    const session = await authHandler();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!can(user, 'leads:write:own')) {
        return NextResponse.json({ error: 'Sem permissão para enviar arquivos' }, { status: 403 });
    }

    const ip = getClientIp(request);
    const rl = await rateLimit(`upload:${ip}`, { limit: 10, windowSec: 60 });
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Muitas requisições' }, { status: 429 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const leadId = formData.get('leadId') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 });
        }

        if (!leadId) {
            return NextResponse.json({ error: 'Lead ID é obrigatório' }, { status: 400 });
        }

        const canAccess = await hasLeadAccess(leadId, user);
        if (!canAccess) {
            return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'Arquivo muito grande (máximo 10MB)' }, { status: 400 });
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 400 });
        }

        const yearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const uploadPath = path.join(UPLOAD_DIR, yearMonth);
        await mkdirHandler(uploadPath, { recursive: true });

        const ext = path.extname(file.name);
        const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
        const uniqueName = `${baseName}-${Date.now()}${ext}`;
        const filePath = path.join(uploadPath, uniqueName);

        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFileHandler(filePath, buffer);

        const document = await prisma.document.create({
            data: {
                leadId,
                uploadedBy: user.id || 'system',
                name: file.name,
                type: file.type,
                size: file.size,
                url: filePath,
            },
        });

        await logAudit({
            userId: user.id,
            action: 'UPLOAD',
            entity: 'Document',
            entityId: document.id,
            changes: { fileName: file.name, fileSize: file.size },
        });

        return NextResponse.json({
            id: document.id,
            fileName: document.name,
            fileType: document.type,
            fileSize: document.size,
            uploadedAt: document.createdAt,
        }, { status: 201 });
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 });
    }
}
