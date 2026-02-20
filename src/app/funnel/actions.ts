'use server';

import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Lead, LeadGrade, LeadPriority, LeadSource, LeadStatus } from '@prisma/client';
import { calculateLeadScore, calcularScore, type DynamicScoringCriterion, type QualificationData } from '@/lib/scoring';
import { processAutomationRules, type AutomationRule } from '@/lib/automation';
import { validateLeadContactPayload } from '@/lib/contact-validation';
import { buildDefaultAutomationRules, DEFAULT_SCORING_CRITERIA } from '@/lib/config-options';
import { notifyActiveManagers } from '@/lib/crm-notifications';
import { logAudit } from '@/lib/audit';
import { normalizeNullableText, normalizeSessionId } from '@/lib/acquisition';

const FUNNEL_TOKEN_KEY = 'funnelToken';
type GateProfile = 'DECISOR' | 'INFLUENCIADOR' | 'PESQUISADOR';
type GradeMeta = {
    label: string;
    prioridade: string;
    slaHoras: number | null;
};

type StepOneAttributionInput = {
    sessionId?: string;
    gateSessionId?: string;
    landingVariant?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
};

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

function normalizeScoringCriteria(value: unknown): DynamicScoringCriterion[] {
    if (!Array.isArray(value)) return [];
    return value as DynamicScoringCriterion[];
}

function normalizeAutomationRules(value: unknown): AutomationRule[] {
    if (!Array.isArray(value)) return [];
    return value as AutomationRule[];
}

function compactRecord<T extends Record<string, string | undefined>>(record: T): Partial<T> {
    const output: Partial<T> = {};
    for (const [key, value] of Object.entries(record)) {
        if (typeof value === 'string' && value.trim().length > 0) {
            output[key as keyof T] = value as T[keyof T];
        }
    }
    return output;
}

function buildStepOneAttribution(formData: StepOneAttributionInput) {
    const sessionId = normalizeSessionId(formData.sessionId) || normalizeSessionId(formData.gateSessionId) || null;
    const utmSource = normalizeNullableText(formData.utmSource, 100);
    const utmMedium = normalizeNullableText(formData.utmMedium, 100);
    const utmCampaign = normalizeNullableText(formData.utmCampaign, 150);
    const utmTerm = normalizeNullableText(formData.utmTerm, 150);
    const utmContent = normalizeNullableText(formData.utmContent, 150);
    const landingVariant = normalizeNullableText(formData.landingVariant, 50);

    const attribution = compactRecord({
        sessionId: sessionId || undefined,
        landingVariant,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
    });

    return {
        sessionId,
        leadUtm: {
            utmSource,
            utmMedium,
            utmCampaign,
            utmTerm,
            utmContent,
        },
        attribution: Object.keys(attribution).length > 0
            ? {
                ...attribution,
                capturedAt: new Date().toISOString(),
            }
            : null,
    };
}

function getAttributionSessionIdFromQualificationData(data: Record<string, unknown>): string | null {
    const attributionRaw = data.attribution;
    if (attributionRaw && typeof attributionRaw === 'object' && !Array.isArray(attributionRaw)) {
        const candidate = normalizeSessionId((attributionRaw as Record<string, unknown>).sessionId as string | undefined);
        if (candidate) return candidate;
    }

    return normalizeSessionId(data.gateSessionId as string | undefined) || null;
}

async function logStepCompletionEvent(params: {
    leadId: string;
    qualificationData: Record<string, unknown>;
    stepNumber: 2 | 3 | 4 | 5;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    const sessionId = getAttributionSessionIdFromQualificationData(params.qualificationData);
    await logAudit({
        action: 'STEP_N_COMPLETE',
        entity: 'AcquisitionEvent',
        entityId: sessionId || params.leadId,
        changes: {
            eventName: 'STEP_N_COMPLETE',
            sessionId: sessionId || null,
            leadId: params.leadId,
            stepNumber: params.stepNumber,
            timestamp: new Date().toISOString(),
            metadata: params.metadata || {},
        },
    });
}

function resolveGradeFromScore(score: number, forceF = false): LeadGrade {
    if (forceF || score < 35) return 'F';
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    return 'D';
}

function resolvePriorityFromGrade(grade: LeadGrade): LeadPriority {
    if (grade === 'A') return 'URGENT';
    if (grade === 'B') return 'HIGH';
    if (grade === 'C') return 'MEDIUM';
    return 'LOW';
}

function resolveGradeMeta(grade: LeadGrade): GradeMeta {
    if (grade === 'A') return { label: 'HOT LEAD - Altissimo Potencial', prioridade: 'CRITICA', slaHoras: 2 };
    if (grade === 'B') return { label: 'WARM LEAD - Alto Potencial', prioridade: 'ALTA', slaHoras: 4 };
    if (grade === 'C') return { label: 'COLD LEAD - Potencial Medio', prioridade: 'MEDIA', slaHoras: 24 };
    if (grade === 'D') return { label: 'VERY COLD - Baixo Potencial', prioridade: 'BAIXA', slaHoras: 72 };
    return { label: 'SEM FIT', prioridade: 'NENHUMA', slaHoras: null };
}

async function resolvePipelineTargets() {
    const pipeline = await prisma.pipeline.findFirst({
        where: { isActive: true },
        include: {
            stages: {
                orderBy: { order: 'asc' },
                select: { id: true, name: true, order: true, isWon: true, isLost: true },
            },
        },
    });

    const stages = pipeline?.stages || [];
    const openStage = stages.find((stage) => !stage.isWon && !stage.isLost) || stages[0] || null;
    const lostStage = stages.find((stage) => stage.isLost) || null;

    return {
        pipelineId: pipeline?.id || null,
        stages,
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
    gateProfile?: GateProfile;
    gateSessionId?: string;
    sessionId?: string;
    landingVariant?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
}) {
    if (!formData.email || !formData.fullName) {
        return { error: 'Dados incompletos.' };
    }

    const gateProfile: GateProfile = formData.gateProfile === 'INFLUENCIADOR' || formData.gateProfile === 'PESQUISADOR'
        ? formData.gateProfile
        : 'DECISOR';
    const isDecisionMaker = formData.isDecisionMaker ?? (gateProfile === 'DECISOR' ? 'yes' : 'no');

    if (isDecisionMaker === 'no') {
        redirect('/');
    }

    try {
        const validatedContact = await validateLeadContactPayload({
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
        });
        if (!validatedContact.ok) {
            return { error: validatedContact.error || 'Dados de contato invalidos.' };
        }

        const { defaultStageId } = await resolvePipelineTargets();
        const funnelToken = randomUUID();
        const stepOneAttribution = buildStepOneAttribution(formData);

        const lead = await prisma.lead.create({
            data: {
                name: validatedContact.normalized.fullName,
                email: validatedContact.normalized.email,
                phone: validatedContact.normalized.phone,
                company: formData.companyName.trim(),
                source: LeadSource.WEBSITE,
                status: LeadStatus.NEW,
                utmSource: stepOneAttribution.leadUtm.utmSource,
                utmMedium: stepOneAttribution.leadUtm.utmMedium,
                utmCampaign: stepOneAttribution.leadUtm.utmCampaign,
                utmTerm: stepOneAttribution.leadUtm.utmTerm,
                utmContent: stepOneAttribution.leadUtm.utmContent,
                pipelineStageId: defaultStageId,
                qualificationData: {
                    isDecisionMaker: true,
                    gateProfile,
                    gateSessionId: formData.gateSessionId || null,
                    attribution: stepOneAttribution.attribution,
                    step1CompletedAt: new Date().toISOString(),
                    contactValidation: {
                        emailDomain: validatedContact.meta.emailDomain,
                        mxChecked: validatedContact.meta.mxChecked,
                        mxFound: validatedContact.meta.mxFound,
                    },
                    [FUNNEL_TOKEN_KEY]: funnelToken,
                },
            },
        });

        await logAudit({
            action: 'STEP1_SUBMIT_SUCCESS',
            entity: 'AcquisitionEvent',
            entityId: stepOneAttribution.sessionId || lead.id,
            changes: {
                eventName: 'STEP1_SUBMIT_SUCCESS',
                sessionId: stepOneAttribution.sessionId || null,
                leadId: lead.id,
                page: '/funnel',
                ctaId: 'step1_submit',
                variant: stepOneAttribution.attribution?.landingVariant || null,
                utmSource: stepOneAttribution.leadUtm.utmSource || null,
                utmMedium: stepOneAttribution.leadUtm.utmMedium || null,
                utmCampaign: stepOneAttribution.leadUtm.utmCampaign || null,
                utmTerm: stepOneAttribution.leadUtm.utmTerm || null,
                utmContent: stepOneAttribution.leadUtm.utmContent || null,
                timestamp: new Date().toISOString(),
            },
        });

        try {
            await notifyActiveManagers({
                title: 'Novo lead no funil',
                message: `${lead.name} iniciou o funil de qualificação.`,
                link: `/dashboard/leads/${lead.id}`,
                emailSubject: 'Novo lead no funil de qualificação',
            });
        } catch (notifyErr) {
            console.error('Failed to notify managers on funnel step 1:', notifyErr);
        }

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
        erpSystem: string;
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
        await logStepCompletionEvent({
            leadId,
            qualificationData: existingData,
            stepNumber: 2,
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
                    desafios: formData.desafios,
                    motivacao: formData.motivacao,
                    urgencia: formData.urgencia,
                    historicoRedes: formData.historicoRedes,
                    [FUNNEL_TOKEN_KEY]: token,
                    step3CompletedAt: new Date().toISOString(),
                },
            },
        });
        await logStepCompletionEvent({
            leadId,
            qualificationData: existingData,
            stepNumber: 3,
        });

        redirect(buildFunnelUrl('/funnel/investimento', { leadId, token }));
    } catch (error) {
        if (isRedirectError(error)) throw error;
        console.error('Error step 3:', error);
        return { error: 'Erro ao atualizar dados.' };
    }
}

// ==========================================
// STEP 4: Investment + FINAL SCORING
// (Antiga etapa 5, renumerada após merge das etapas 3+4)
// ==========================================
export async function submitStepFive(
    leadId: string,
    token: string,
    formData: {
        conscienciaInvestimento: string;
        reacaoValores: string;
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
            conscienciaInvestimento: formData.conscienciaInvestimento,
            reacaoValores: formData.reacaoValores,
            compromisso: formData.compromisso,
        };

        const legacyScoringResult = calcularScore(fullData);
        const pipelineTargets = await resolvePipelineTargets();

        const qualificationDataPayload = {
            ...existingData,
            ...formData,
            [FUNNEL_TOKEN_KEY]: token,
            step5CompletedAt: new Date().toISOString(),
        };

        const settings = await prisma.systemSettings.findMany({
            where: { key: { in: ['config.scoringCriteria.v1', 'config.automationRules.v1'] } },
        });

        const configuredCriteria = normalizeScoringCriteria(
            settings.find((setting) => setting.key === 'config.scoringCriteria.v1')?.value
        );
        const scoringCriteria = configuredCriteria.length > 0 ? configuredCriteria : DEFAULT_SCORING_CRITERIA;

        const leadForDynamicScore = {
            ...lead,
            qualificationData: qualificationDataPayload,
        };

        const dynamicScore = calculateLeadScore(leadForDynamicScore, scoringCriteria);

        let resolvedGrade = resolveGradeFromScore(dynamicScore, legacyScoringResult.eliminado);
        let resolvedStatus = resolvedGrade === 'F' ? LeadStatus.LOST : LeadStatus.QUALIFIED;
        let pipelineStageId = lead.pipelineStageId;

        if (resolvedGrade === 'F') {
            pipelineStageId = pipelineTargets.lostStageId || pipelineStageId;
        } else if (resolvedGrade === 'A' || resolvedGrade === 'B') {
            pipelineStageId = pipelineTargets.defaultStageId || pipelineStageId;
        }

        const allStages = pipelineTargets.pipelineId
            ? await prisma.pipelineStage.findMany({ where: { pipelineId: pipelineTargets.pipelineId } })
            : [];

        const configuredRules = normalizeAutomationRules(
            settings.find((setting) => setting.key === 'config.automationRules.v1')?.value
        );
        const automationRules =
            configuredRules.length > 0
                ? configuredRules
                : buildDefaultAutomationRules(pipelineTargets.stages);

        const automationResult = processAutomationRules(
            {
                ...lead,
                qualificationData: qualificationDataPayload,
                score: dynamicScore,
                grade: resolvedGrade,
                status: resolvedStatus,
                pipelineStageId,
            } as Lead,
            automationRules,
            allStages
        );

        if (automationResult.updates.pipelineStageId) {
            pipelineStageId = automationResult.updates.pipelineStageId;
        }

        const targetStage = allStages.find((stage) => stage.id === pipelineStageId);
        if (targetStage?.isLost) {
            resolvedStatus = LeadStatus.LOST;
            resolvedGrade = 'F';
        } else if (resolvedGrade === 'F') {
            resolvedStatus = LeadStatus.LOST;
        }

        const gradeMeta = resolveGradeMeta(resolvedGrade);
        const resolvedPriority = resolvePriorityFromGrade(resolvedGrade);

        await prisma.lead.update({
            where: { id: leadId },
            data: {
                status: resolvedStatus,
                score: dynamicScore,
                grade: resolvedGrade,
                qualificationData: {
                    ...qualificationDataPayload,
                    scoringResult: {
                        source: 'dynamic-config',
                        grade: resolvedGrade,
                        scoreNormalizado: dynamicScore,
                        label: gradeMeta.label,
                        prioridade: gradeMeta.prioridade,
                        slaHoras: gradeMeta.slaHoras,
                        detalhes: legacyScoringResult.detalhes,
                        dynamic: {
                            criteriaCount: scoringCriteria.length,
                            enabledAutomationRules: automationRules.filter((rule) => rule.enabled).length,
                            automationActions: automationResult.actions,
                            automationNotifications: automationResult.notifications,
                        },
                    },
                },
                pipelineStageId,
                priority: resolvedPriority,
                assignedUserId: automationResult.updates.assignedUserId || lead.assignedUserId,
            },
        });

        await logStepCompletionEvent({
            leadId,
            qualificationData: existingData,
            stepNumber: 5,
            metadata: {
                grade: resolvedGrade,
                score: dynamicScore,
            },
        });

        try {
            await notifyActiveManagers({
                title: 'Lead concluiu qualificação',
                message: `${lead.name} concluiu o formulário. Grade ${resolvedGrade} e score ${dynamicScore}.`,
                link: `/dashboard/leads/${leadId}`,
                emailSubject: 'Lead concluiu o formulário de qualificação',
            });
        } catch (notifyErr) {
            console.error('Failed to notify managers on funnel step 5:', notifyErr);
        }

        redirect(
            buildFunnelUrl('/funnel/resultado', {
                leadId,
                grade: resolvedGrade,
                token,
            })
        );
    } catch (error) {
        if (isRedirectError(error)) throw error;
        console.error('Error step 5:', error);
        return { error: 'Erro ao finalizar qualificação.' };
    }
}

export async function submitInfluencerLead(data: {
    name: string;
    email: string;
    profile: string;
    sessionId?: string;
}) {
    try {
        const lead = await prisma.lead.create({
            data: {
                name: data.name,
                email: data.email,
                phone: '',
                source: LeadSource.WEBSITE,
                status: LeadStatus.NEW,
                priority: LeadPriority.LOW,
                score: 0,
                grade: 'F',
                customFields: {
                    influencerProfile: data.profile,
                    sessionId: data.sessionId,
                },
            },
        });

        return { success: true, leadId: lead.id };
    } catch (error) {
        console.error('Error submitting influencer lead:', error);
        return { error: 'Erro ao registrar contato de influenciador.' };
    }
}
