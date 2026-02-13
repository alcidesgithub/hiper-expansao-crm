import { z } from 'zod';

// ==========================================
// LEAD SCHEMAS
// ==========================================

export const leadCreateSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email invÃ¡lido'),
    phone: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    source: z.enum([
        'WEBSITE', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE_ADS',
        'LINKEDIN', 'EMAIL', 'PHONE', 'REFERRAL', 'EVENT', 'OTHER'
    ]).optional().default('WEBSITE'),
    assignedUserId: z.string().optional().nullable(),
    pipelineStageId: z.string().optional().nullable(),
});

export const leadUpdateSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    position: z.string().optional().nullable(),
    status: z.enum([
        'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL',
        'NEGOTIATION', 'WON', 'LOST', 'ARCHIVED'
    ]).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    pipelineStageId: z.string().optional().nullable(),
    assignedUserId: z.string().optional().nullable(),
});

// ==========================================
// MEETING SCHEMAS
// ==========================================

export const meetingCreateSchema = z.object({
    leadId: z.string().min(1, 'Lead Ã© obrigatÃ³rio'),
    userId: z.string().min(1, 'Consultor Ã© obrigatÃ³rio'),
    title: z.string().min(2, 'TÃ­tulo Ã© obrigatÃ³rio'),
    description: z.string().optional().nullable(),
    startTime: z.string().datetime({ message: 'Data/hora de inÃ­cio invÃ¡lida' }),
    endTime: z.string().datetime({ message: 'Data/hora de fim invÃ¡lida' }),
    location: z.string().optional().nullable(),
    provider: z.enum(['teams']).optional().default('teams'),
    selfScheduled: z.boolean().optional().default(false),
});

export const meetingUpdateSchema = z.object({
    title: z.string().min(2).optional(),
    description: z.string().optional().nullable(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED']).optional(),
    location: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    nextSteps: z.string().optional().nullable(),
    outcome: z.string().optional().nullable(),
});

// ==========================================
// NOTES & TASKS SCHEMAS
// ==========================================

export const noteCreateSchema = z.object({
    content: z.string().min(1, 'ConteÃºdo Ã© obrigatÃ³rio'),
    isPinned: z.boolean().optional().default(false),
});

export const taskCreateSchema = z.object({
    title: z.string().min(2, 'TÃ­tulo Ã© obrigatÃ³rio'),
    description: z.string().optional().nullable(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
    dueDate: z.string().datetime().optional().nullable(),
});

export const taskUpdateSchema = z.object({
    title: z.string().min(2).optional(),
    description: z.string().optional().nullable(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    dueDate: z.string().datetime().optional().nullable(),
});

// ==========================================
// SCHEDULING SCHEMAS
// ==========================================

export const scheduleBookingSchema = z.object({
    leadId: z.string().min(1, 'Lead obrigatorio'),
    token: z.string().min(16, 'Token de sessao invalido'),
    consultorId: z.string().min(1, 'Consultor obrigatorio'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser YYYY-MM-DD'),
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Horario invalido'),
    notes: z.string().optional().default(''),
});

// ==========================================
// PRICING SCHEMA
// ==========================================

export const pricingCreateSchema = z.object({
    name: z.string().min(2, 'Nome Ã© obrigatÃ³rio'),
    effectiveDate: z.string().datetime({ message: 'Data de vigÃªncia invÃ¡lida' }),
    expiryDate: z.string().datetime().optional().nullable(),
    isActive: z.boolean().optional().default(false),
    marketingMonthly: z.number().positive('Valor de marketing deve ser positivo'),
    marketingDescription: z.string().optional().default(''),
    adminMonthly: z.number().positive('Valor administrativo deve ser positivo'),
    adminDescription: z.string().optional().default(''),
});

// ==========================================
// USER SCHEMAS
// ==========================================

export const userCreateSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email invalido'),
    role: z.enum(['ADMIN', 'DIRECTOR', 'MANAGER', 'CONSULTANT']),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
    department: z.string().max(120).optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
});

export const userUpdateSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    role: z.enum(['ADMIN', 'DIRECTOR', 'MANAGER', 'CONSULTANT']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
    department: z.string().max(120).optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    password: z.string().min(6).optional(),
});

