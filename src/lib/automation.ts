
import { Lead, PipelineStage } from '@prisma/client';

export interface AutomationRule {
    id: string;
    name: string;
    enabled: boolean;
    triggerField: string;
    operator: string;
    triggerValue: string;
    actionType: string; // 'notify_manager' | 'move_stage' | 'add_tag'
    actionTarget: string;
}

export interface AutomationResult {
    updates: Partial<Lead>;
    notifications: Array<{ type: string; target: string; message: string }>;
    actions: Array<{ type: string; target: string }>;
}

export function processAutomationRules(
    lead: Partial<Lead>,
    rules: AutomationRule[],
    stages: PipelineStage[]
): AutomationResult {
    const result: AutomationResult = {
        updates: {},
        notifications: [],
        actions: [],
    };

    const activeRules = rules.filter((r) => r.enabled);

    for (const rule of activeRules) {
        if (evaluateCondition(lead, rule)) {
            applyAction(rule, result, stages);
        }
    }

    return result;
}

function evaluateCondition(lead: Partial<Lead>, rule: AutomationRule): boolean {
    const value = resolveFieldValue(lead, rule.triggerField);
    return evaluateOperator(value, rule.operator, rule.triggerValue);
}

function applyAction(rule: AutomationRule, result: AutomationResult, stages: PipelineStage[]) {
    switch (rule.actionType) {
        case 'move_stage':
            // Find stage by name or ID
            const targetStage = stages.find(
                (s) => s.id === rule.actionTarget || s.name.toLowerCase() === rule.actionTarget.toLowerCase()
            );
            if (targetStage) {
                result.updates.pipelineStageId = targetStage.id;
                // If moving to a Won/Lost stage, update status too if needed? 
                // For now just pipelineStageId is enough, the system should handle status sync if needed.
            }
            break;
        case 'notify_manager':
            result.notifications.push({
                type: 'manager_alert',
                target: rule.actionTarget,
                message: `Regra "${rule.name}" acionada para o lead.`,
            });
            break;
        case 'assign_user':
            result.updates.assignedUserId = rule.actionTarget;
            break;
        case 'notify_user': // Explicit user notification
            result.notifications.push({
                type: 'user_alert',
                target: rule.actionTarget,
                message: `Regra "${rule.name}" acionada para o lead.`,
            });
            break;
        case 'add_tag':
            // Assuming tags are stored in customFields or a specific field. 
            // For now, allow pushing to an 'actions' array to be handled by the caller
            result.actions.push({ type: 'add_tag', target: rule.actionTarget });
            break;
    }
}

function resolveFieldValue(lead: Partial<Lead>, rawPath: string): unknown {
    if (!rawPath) return undefined;
    const path = rawPath.startsWith('lead.') ? rawPath.slice(5) : rawPath;

    return path.split('.').reduce<unknown>((current, segment) => {
        if (current === null || current === undefined) return undefined;
        if (typeof current !== 'object') return undefined;
        return (current as Record<string, unknown>)[segment];
    }, lead as unknown);
}

function parseList(value: string): string[] {
    return value
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
}

function normalizeValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim().toLowerCase();
}

function evaluateOperator(actualValue: unknown, operator: string, triggerValue: string): boolean {
    if (operator === 'exists') return actualValue !== null && actualValue !== undefined && String(actualValue).trim() !== '';
    if (operator === 'not_exists') return actualValue === null || actualValue === undefined || String(actualValue).trim() === '';

    const actualList = Array.isArray(actualValue)
        ? actualValue.map((value) => normalizeValue(value)).filter(Boolean)
        : [];
    const actual = normalizeValue(actualValue);
    const expected = normalizeValue(triggerValue);

    const actualNumber = Number(actualValue);
    const expectedNumber = Number(triggerValue);
    const isNumeric = Number.isFinite(actualNumber) && Number.isFinite(expectedNumber);

    switch (operator) {
        case '>':
            return isNumeric ? actualNumber > expectedNumber : actual > expected;
        case '<':
            return isNumeric ? actualNumber < expectedNumber : actual < expected;
        case '>=':
            return isNumeric ? actualNumber >= expectedNumber : actual >= expected;
        case '<=':
            return isNumeric ? actualNumber <= expectedNumber : actual <= expected;
        case '==':
        case '=':
            if (actualList.length > 0) return actualList.includes(expected);
            return actual === expected;
        case '!=':
            if (actualList.length > 0) return !actualList.includes(expected);
            return actual !== expected;
        case 'contains':
            if (actualList.length > 0) return actualList.includes(expected);
            return actual.includes(expected);
        case 'in': {
            const expectedList = parseList(triggerValue);
            if (actualList.length > 0) return actualList.some((value) => expectedList.includes(value));
            return expectedList.includes(actual);
        }
        case 'not_in': {
            const expectedList = parseList(triggerValue);
            if (actualList.length > 0) return actualList.every((value) => !expectedList.includes(value));
            return !expectedList.includes(actual);
        }
        default:
            return false;
    }
}
