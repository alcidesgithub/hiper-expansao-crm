import { Prisma } from '@prisma/client';

const OVERLAP_CONSTRAINT = 'meeting_no_overlap_active';
const EXCLUSION_CONFLICT_FRAGMENT = 'conflicting key value violates exclusion constraint';

function hasOverlapMarkers(message: string): boolean {
    const normalized = message.toLowerCase();
    return normalized.includes(OVERLAP_CONSTRAINT) || normalized.includes(EXCLUSION_CONFLICT_FRAGMENT);
}

export function isMeetingOverlapError(error: unknown): boolean {
    if (!error) return false;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (hasOverlapMarkers(error.message)) return true;
        const meta = error.meta;
        if (meta && hasOverlapMarkers(JSON.stringify(meta))) return true;
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
        return hasOverlapMarkers(error.message);
    }

    if (error instanceof Error) {
        return hasOverlapMarkers(error.message);
    }

    return hasOverlapMarkers(String(error));
}
