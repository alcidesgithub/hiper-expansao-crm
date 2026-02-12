import { prisma } from '@/lib/prisma';

export const DEFAULT_SLOT_START_HOUR = 9;
export const DEFAULT_SLOT_END_HOUR = 17;
export const MEETING_DURATION_MINUTES = 60;

interface DateParts {
    year: number;
    month: number;
    day: number;
}

export interface PublicAvailabilitySlot {
    time: string;
    available: boolean;
    consultorId?: string;
    consultorName?: string;
}

export type PublicAvailabilityResult =
    | {
        ok: true;
        date: string;
        slots: PublicAvailabilitySlot[];
        availableCount: number;
        message?: string;
    }
    | {
        ok: false;
        status: number;
        error: string;
    };

type TimeInterval = { startMinutes: number; endMinutes: number };

export function parseDateParts(date: string): DateParts | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

    const [yearRaw, monthRaw, dayRaw] = date.split('-');
    const year = Number.parseInt(yearRaw, 10);
    const month = Number.parseInt(monthRaw, 10);
    const day = Number.parseInt(dayRaw, 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

    const parsed = new Date(year, month - 1, day);
    if (
        parsed.getFullYear() !== year ||
        parsed.getMonth() !== month - 1 ||
        parsed.getDate() !== day
    ) {
        return null;
    }

    return { year, month, day };
}

export function buildLocalDate(parts: DateParts, hour = 0, minute = 0, second = 0, ms = 0): Date {
    return new Date(parts.year, parts.month - 1, parts.day, hour, minute, second, ms);
}

export function parseTimeToMinutes(time: string): number | null {
    if (!/^\d{2}:\d{2}$/.test(time)) return null;
    const [hourRaw, minuteRaw] = time.split(':');
    const hour = Number.parseInt(hourRaw, 10);
    const minute = Number.parseInt(minuteRaw, 10);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return hour * 60 + minute;
}

export function isTimeWithinIntervals(
    intervals: TimeInterval[],
    startMinutes: number,
    durationMinutes = MEETING_DURATION_MINUTES
): boolean {
    return intervals.some((interval) => (
        interval.startMinutes <= startMinutes &&
        interval.endMinutes >= startMinutes + durationMinutes
    ));
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
    return startA < endB && endA > startB;
}

function buildInterval(startTime: string, endTime: string): TimeInterval | null {
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    if (startMinutes === null || endMinutes === null) return null;
    if (startMinutes >= endMinutes) return null;
    return { startMinutes, endMinutes };
}

function formatMinutes(minutes: number): string {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function buildDefaultIntervals(): TimeInterval[] {
    return [{
        startMinutes: DEFAULT_SLOT_START_HOUR * 60,
        endMinutes: DEFAULT_SLOT_END_HOUR * 60,
    }];
}

function buildCandidateStartTimes(intervals: TimeInterval[]): number[] {
    const times = new Set<number>();
    for (const interval of intervals) {
        for (
            let start = interval.startMinutes;
            start + MEETING_DURATION_MINUTES <= interval.endMinutes;
            start += MEETING_DURATION_MINUTES
        ) {
            times.add(start);
        }
    }
    return Array.from(times).sort((a, b) => a - b);
}

export async function getPublicAvailabilitySlotsForDate(
    date: string,
    options?: { minAdvanceHours?: number }
): Promise<PublicAvailabilityResult> {
    const dateParts = parseDateParts(date);
    if (!dateParts) {
        return { ok: false, status: 400, error: 'Parametro date invalido' };
    }

    const minAdvanceHours = options?.minAdvanceHours ?? 2;
    const minAdvanceTime = new Date(Date.now() + minAdvanceHours * 60 * 60 * 1000);
    const targetDate = buildLocalDate(dateParts);
    const dayOfWeek = targetDate.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return {
            ok: true,
            date,
            slots: [],
            availableCount: 0,
            message: 'Nao atendemos aos finais de semana',
        };
    }

    const dayStart = buildLocalDate(dateParts, 0, 0, 0, 0);
    const dayEnd = buildLocalDate(dateParts, 23, 59, 59, 999);

    const consultors = await prisma.user.findMany({
        where: {
            status: 'ACTIVE',
            role: { in: ['CONSULTANT', 'SDR'] },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
    });

    if (consultors.length === 0) {
        return { ok: true, date, slots: [], availableCount: 0 };
    }

    const consultorIds = consultors.map((consultor) => consultor.id);

    const [daySlots, configuredSlotsCount, dayBlocks, existingMeetings] = await Promise.all([
        prisma.availabilitySlot.findMany({
            where: {
                userId: { in: consultorIds },
                dayOfWeek,
                isActive: true,
            },
            select: { userId: true, startTime: true, endTime: true },
        }),
        prisma.availabilitySlot.count({
            where: { userId: { in: consultorIds } },
        }),
        prisma.availabilityBlock.findMany({
            where: {
                userId: { in: consultorIds },
                startDate: { lt: dayEnd },
                endDate: { gt: dayStart },
            },
            select: { userId: true, startDate: true, endDate: true },
        }),
        prisma.meeting.findMany({
            where: {
                userId: { in: consultorIds },
                status: { in: ['SCHEDULED', 'RESCHEDULED'] },
                startTime: { lt: dayEnd },
                endTime: { gt: dayStart },
            },
            select: { userId: true, startTime: true, endTime: true },
        }),
    ]);

    const useDefaultSlots = configuredSlotsCount === 0;
    const availabilityByConsultor = new Map<string, TimeInterval[]>();
    const blocksByConsultor = new Map<string, Array<{ startDate: Date; endDate: Date }>>();

    for (const consultor of consultors) {
        availabilityByConsultor.set(consultor.id, useDefaultSlots ? buildDefaultIntervals() : []);
        blocksByConsultor.set(consultor.id, []);
    }

    if (!useDefaultSlots) {
        for (const slot of daySlots) {
            const interval = buildInterval(slot.startTime, slot.endTime);
            if (!interval) continue;
            const current = availabilityByConsultor.get(slot.userId) || [];
            current.push(interval);
            availabilityByConsultor.set(slot.userId, current);
        }
    }

    for (const block of dayBlocks) {
        const current = blocksByConsultor.get(block.userId) || [];
        current.push({ startDate: block.startDate, endDate: block.endDate });
        blocksByConsultor.set(block.userId, current);
    }

    const candidateTimes = buildCandidateStartTimes(
        Array.from(availabilityByConsultor.values()).flat()
    );

    const slots: PublicAvailabilitySlot[] = [];

    for (const startMinutes of candidateTimes) {
        const slotStart = buildLocalDate(
            dateParts,
            Math.floor(startMinutes / 60),
            startMinutes % 60,
            0,
            0
        );
        const slotEnd = new Date(slotStart.getTime() + MEETING_DURATION_MINUTES * 60 * 1000);
        const time = formatMinutes(startMinutes);

        if (slotStart < minAdvanceTime) {
            slots.push({ time, available: false });
            continue;
        }

        const freeConsultor = consultors.find((consultor) => {
            const consultorIntervals = availabilityByConsultor.get(consultor.id) || [];
            if (!isTimeWithinIntervals(consultorIntervals, startMinutes)) return false;

            const isBlocked = (blocksByConsultor.get(consultor.id) || []).some((block) =>
                overlaps(block.startDate, block.endDate, slotStart, slotEnd)
            );
            if (isBlocked) return false;

            const hasMeetingConflict = existingMeetings.some((meeting) =>
                meeting.userId === consultor.id &&
                overlaps(meeting.startTime, meeting.endTime, slotStart, slotEnd)
            );

            return !hasMeetingConflict;
        });

        slots.push({
            time,
            available: Boolean(freeConsultor),
            consultorId: freeConsultor?.id,
            consultorName: freeConsultor?.name,
        });
    }

    return {
        ok: true,
        date,
        slots,
        availableCount: slots.filter((slot) => slot.available).length,
    };
}

export async function validateConsultorAvailabilityWindow(params: {
    consultorId: string;
    startTime: Date;
    endTime: Date;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
    const { consultorId, startTime, endTime } = params;
    const dayOfWeek = startTime.getDay();

    const [slotsForDay, totalConfiguredSlots, blockingRange] = await Promise.all([
        prisma.availabilitySlot.findMany({
            where: {
                userId: consultorId,
                dayOfWeek,
                isActive: true,
            },
            select: { startTime: true, endTime: true },
        }),
        prisma.availabilitySlot.count({
            where: { userId: consultorId },
        }),
        prisma.availabilityBlock.findFirst({
            where: {
                userId: consultorId,
                startDate: { lt: endTime },
                endDate: { gt: startTime },
            },
            select: { id: true },
        }),
    ]);

    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const consultorIntervals = slotsForDay
        .map((slot) => buildInterval(slot.startTime, slot.endTime))
        .filter((slot): slot is TimeInterval => Boolean(slot));

    const useDefaultSlots = totalConfiguredSlots === 0;
    const validIntervals = useDefaultSlots ? buildDefaultIntervals() : consultorIntervals;

    if (!isTimeWithinIntervals(validIntervals, startMinutes)) {
        return { ok: false, reason: 'Horario fora da disponibilidade do consultor' };
    }

    if (blockingRange) {
        return { ok: false, reason: 'Horario bloqueado para este consultor' };
    }

    return { ok: true };
}
