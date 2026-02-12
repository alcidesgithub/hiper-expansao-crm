'use server';

import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { LeadSource, LeadStatus } from '@prisma/client';
import { calcularScore, type QualificationData } from '@/lib/scoring';

const FUNNEL_TOKEN_KEY = 'funnelToken';

function isRedirectError(error: unknown): error is { digest: string } {
    if (!error || typeof error !== 'object' || !('digest' in error)) return false;
    const digest = (error as { digest?: unknown }).digest;
    return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
}

function getQualificationData(data: unknown): Record<string, unknown> {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    return data as Record<string, unknown>;
}

function isValidFunnelToken(data: Record<string, unknown>, token: string): boolean {
    return typeof data[FUNNEL_TOKEN_KEY] === 'string' && data[FUNNEL_TOKEN_KEY] === token;
}

function buildFunnelUrl(pathname: string, params: Record<string, string>): string {
    const query = new URLSearchParams(params);
    return `${pathname}?${query.toString()}`;
}

async function resolvePipelineTargets() {
    const pipeline = await prisma.pipeline.findFirst({
        where: { isActive: true },
        include: {
            stages: {
                orderBy: { order: 'asc' },
                select: { id: true, isWon: true, isLost: true },
            },
        },
    });

    const stages = pipeline?.stages || [];
    const openStage = stages.find((stage) => !stage.isWon && !stage.isLost) || stages[0] || null;
    const lostStage = stages.find((stage) => stage.isLost) || null;

    return {
        defaultStageId: openStage?.id || null,
        lostStageId: lostStage?.id || null,
    };
}

// ==========================================
// STEP 1: Gate + Identification
// ==========================================
export async function submitStepOne(formData: {
    fullName: string;
    email: string;
    phone: string;
    companyName: string;
    isDecisionMaker?: string;
}) {
    if (!formData.email || !formData.fullName) {
        return { error: 'Dados incompletos.' };
    }

    const isDecisionMaker = formData.isDecisionMaker ?? 'yes';

    if (isDecisionMaker === 'no') {
        redirect('/funnel/educacao?perfil=influenciador');
    }

    try {
        const { defaultStageId } = await resolvePipelineTargets();
        const funnelToken = randomUUID();

        const lead = await prisma.lead.create({
            data: {
                name: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                company: formData.companyName,
                source: LeadSource.WEBSITE,
                status: LeadStatus.NEW,
                pipelineStageId: defaultStageId,
                qualificationData: {
                    isDecisionMaker: true,
                    step1CompletedAt: new Date().toISOString(),
                    [FUNNEL_TOKEN_KEY]: funnelToken,
                },
            },
        });

        redirect(
            buildFunnelUrl('/funnel/business-info', {
                leadId: lead.id,
                token: funnelToken,
            })
        );
    } catch (error) {
        if (isRedirectError(error)) throw error;
        console.error('Error creating lead:', error);
        return { error: 'Erro ao criar lead. Tente novamente.' };
    }
}

// ==========================================
// STEP 2: Business Profile
// ==========================================
export async function submitStepTwo(
    leadId: string,
    token: string,
    formData: {
        cargo: string;
        cargoSub?: string;
        numeroLojas: string;
        lojasSub?: string;
        faturamento: string;
        localizacao: string;
        tempoMercado: string;
    }
) {
    if (!leadId || !token) return { error: 'Sessão de qualificação inválida.' };

    try {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) return { error: 'Lead não encontrado.' };

        const existingData = getQualificationData(lead.qualificationData);
        if (!isValidFunnelToken(existingData, token)) {
            return { error: 'Sessão de qualificação inválida.' };
        }

        await prisma.lead.update({
            where: { id: leadId },
            data: {
                qualificationData: {
                    ...existingData,
                    ...formData,
                    [FUNNEL_TOKEN_KEY]: token,
                    step2CompletedAt: new Date().toISOString(),
                },
            },
        });

        redirect(buildFunnelUrl('/funnel/desafios', { leadId, token }));
    } catch (error) {
        if (isRedirectError(error)) throw error;
        console.error('Error step 2:', error);
        return { error: 'Erro ao atualizar dados.' };
    }
}

// ==========================================
// STEP 3: Challenges & Motivations
// ==========================================
export async function submitStepThree(
    leadId: string,
    token: string,
    formData: {
        desafios: string[];
        motivacao: string;
    }
) {
    if (!leadId || !token) return { error: 'Sessão de qualificação inválida.' };

    try {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) return { error: 'Lead não encontrado.' };

        const existingData = getQualificationData(lead.qualificationData);
        if (!isValidFunnelToken(existingData, token)) {
            return { error: 'Sessão de qualificação inválida.' };
        }

        await prisma.lead.update({
            where: { id: leadId },
            data: {
                qualificationData: {
                    ...existingData,
                    desafios: formData.desafios,
                    motivacao: formData.motivacao,
                    [FUNNEL_TOKEN_KEY]: token,
                    step3CompletedAt: new Date().toISOString(),
                },
            },
        });

        redirect(buildFunnelUrl('/funnel/urgencia', { leadId, token }));
    } catch (error) {
        if (isRedirectError(error)) throw error;
        console.error('Error step 3:', error);
        return { error: 'Erro ao atualizar dados.' };
    }
}

// ==========================================
// STEP 4: Urgency & History
// ==========================================
export async function submitStepFour(
    leadId: string,
    token: string,
    formData: {
        urgencia: string;
        historicoRedes: string;
    }
) {
    if (!leadId || !token) return { error: 'Sessão de qualificação inválida.' };

    try {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) return { error: 'Lead não encontrado.' };

        const existingData = getQualificationData(lead.qualificationData);
        if (!isValidFunnelToken(existingData, token)) {
            return { error: 'Sessão de qualificação inválida.' };
        }

        await prisma.lead.update({
            where: { id: leadId },
            data: {
                qualificationData: {
                    ...existingData,
                    urgencia: formData.urgencia,
                    historicoRedes: formData.historicoRedes,
                    [FUNNEL_TOKEN_KEY]: token,
                    step4CompletedAt: new Date().toISOString(),
                },
            },
        });

        redirect(buildFunnelUrl('/funnel/investimento', { leadId, token }));
    } catch (error) {
        if (isRedirectError(error)) throw error;
        console.error('Error step 4:', error);
        return { error: 'Erro ao atualizar dados.' };
    }
}

// ==========================================
// STEP 5: Investment + FINAL SCORING
// ==========================================
export async function submitStepFive(
    leadId: string,
    token: string,
    formData: {
        conscienciaInvestimento: string;
        reacaoValores: string;
        capacidadeMarketing: string;
        capacidadeAdmin: string;
        capacidadePagamentoTotal: string;
        compromisso: string;
    }
) {
    if (!leadId || !token) return { error: 'Sessão de qualificação inválida.' };

    try {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) return { error: 'Lead não encontrado.' };

        const existingData = getQualificationData(lead.qualificationData);
        if (!isValidFunnelToken(existingData, token)) {
            return { error: 'Sessão de qualificação inválida.' };
        }

        const fullData: QualificationData = {
            isDecisionMaker: true,
            nome: lead.name,
            email: lead.email,
            telefone: lead.phone,
            empresa: lead.company || '',
            cargo: (existingData.cargo as string) || '',
            cargoSub: (existingData.cargoSub as string) || undefined,
            numeroLojas: (existingData.numeroLojas as string) || '1',
            lojasSub: (existingData.lojasSub as string) || undefined,
            faturamento: (existingData.faturamento as string) || '0-50k',
            localizacao: (existingData.localizacao as string) || 'outros',
            tempoMercado: (existingData.tempoMercado as string) || '<1a',
            desafios: (existingData.desafios as string[]) || [],
            motivacao: (existingData.motivacao as string) || '',
            urgencia: (existingData.urgencia as string) || 'sem-prazo',
            historicoRedes: (existingData.historicoRedes as string) || 'nunca',
            ...formData,
        };

        const scoringResult = calcularScore(fullData);
        const { defaultStageId, lostStageId } = await resolvePipelineTargets();

        let pipelineStageId = lead.pipelineStageId;
        if (scoringResult.grade === 'F') {
            pipelineStageId = lostStageId || pipelineStageId;
        } else if (scoringResult.grade === 'A' || scoringResult.grade === 'B') {
            pipelineStageId = defaultStageId || pipelineStageId;
        }

        await prisma.lead.update({
            where: { id: leadId },
            data: {
                status: scoringResult.grade === 'F' ? LeadStatus.LOST : LeadStatus.QUALIFIED,
                score: scoringResult.scoreNormalizado,
                grade: scoringResult.grade,
                qualificationData: {
                    ...existingData,
                    ...formData,
                    [FUNNEL_TOKEN_KEY]: token,
                    step5CompletedAt: new Date().toISOString(),
                    scoringResult: {
                        grade: scoringResult.grade,
                        scoreNormalizado: scoringResult.scoreNormalizado,
                        label: scoringResult.label,
                        prioridade: scoringResult.prioridade,
                        slaHoras: scoringResult.slaHoras,
                        detalhes: scoringResult.detalhes,
                    },
                },
                pipelineStageId,
                priority:
                    scoringResult.grade === 'A'
                        ? 'URGENT'
                        : scoringResult.grade === 'B'
                            ? 'HIGH'
                            : scoringResult.grade === 'C'
                                ? 'MEDIUM'
                                : 'LOW',
            },
        });

        redirect(
            buildFunnelUrl('/funnel/resultado', {
                leadId,
                grade: scoringResult.grade,
                token,
            })
        );
    } catch (error) {
        if (isRedirectError(error)) throw error;
        console.error('Error step 5:', error);
        return { error: 'Erro ao finalizar qualificação.' };
    }
}
