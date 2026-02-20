import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { notifyActiveManagers, notifyAssignableUser } from '@/lib/crm-notifications';

export const dynamic = 'force-dynamic';

function readBearerToken(request: Request): string | null {
    const authorization = request.headers.get('authorization');
    if (!authorization) return null;
    const [scheme, token] = authorization.split(' ');
    if (!scheme || !token) return null;
    if (scheme.toLowerCase() !== 'bearer') return null;
    return token.trim();
}

function isAuthorizedCronRequest(request: Request): boolean {
    const expectedToken = process.env.SLA_CRON_TOKEN?.trim();
    if (!expectedToken) return false;
    const providedToken = readBearerToken(request);
    if (!providedToken) return false;

    const expectedBuffer = Buffer.from(expectedToken);
    const providedBuffer = Buffer.from(providedToken);
    if (expectedBuffer.length !== providedBuffer.length) return false;

    return timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function GET(request: Request) {
    if (!process.env.SLA_CRON_TOKEN?.trim()) {
        return NextResponse.json(
            { error: 'SLA_CRON_TOKEN nao configurado' },
            { status: 503 }
        );
    }

    if (!isAuthorizedCronRequest(request)) {
        return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    try {
        const thresholdLimit = new Date();
        thresholdLimit.setHours(thresholdLimit.getHours() - 4); // SLA de 4 Horas

        const leadsSlaAtrasado = await prisma.lead.findMany({
            where: {
                grade: 'A',
                pipelineStage: {
                    isWon: false,
                    isLost: false
                },
                OR: [
                    { updatedAt: { lt: thresholdLimit } }
                ]
            },
            include: {
                assignedUser: true
            }
        });

        const notifiedLeads = [];

        for (const lead of leadsSlaAtrasado) {
            // Parsing qualificationData properly
            let qualData: any = {};
            if (lead.qualificationData && typeof lead.qualificationData === 'object' && !Array.isArray(lead.qualificationData)) {
                qualData = lead.qualificationData as any;
            }

            if (qualData.slaNotifiedAt) {
                continue; // Ja notificado anteriormente
            }

            const title = `🚨 SLA Estourado: Lead Urgente Atrasado`;
            const message = `O lead ${lead.name} (${lead.company || 'Sem Empresa'}) está sem movimentação há mais de 4 horas! Favor entrar em contato imediato para evitar perda da oportunidade.`;

            // Notifica consultor responsavel ou, em falta dele, os gerentes disponiveis p/ redespacho
            if (lead.assignedUserId) {
                await notifyAssignableUser(lead.assignedUserId, {
                    title,
                    message,
                    type: 'error',
                    link: `/dashboard/leads/${lead.id}`,
                    emailSubject: `[Hiperfarma CRM] 🚨 SLA Violado - Ação Imediata: ${lead.name}`
                });
            } else {
                await notifyActiveManagers({
                    title,
                    message,
                    type: 'error',
                    link: `/dashboard/leads/${lead.id}`,
                    emailSubject: `[Hiperfarma CRM] 🚨 SLA Violado (Sem Consultor) - ${lead.name}`
                });
            }

            qualData.slaNotifiedAt = new Date().toISOString();

            // Atualiza Lead impedindo de acionar multiplas vezes
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    qualificationData: qualData
                }
            });

            notifiedLeads.push(lead.id);
        }

        return NextResponse.json({
            success: true,
            message: `Cron executado. Notificacoes enviadas para ${notifiedLeads.length} leads.`,
            notifiedLeads
        });
    } catch (error) {
        console.error('Error in SLA cron job:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Erro ao processar verificacao de SLA',
        }, { status: 500 });
    }
}
