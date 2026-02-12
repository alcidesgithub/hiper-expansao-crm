import { NextResponse } from 'next/server';
import { getClientIp, rateLimit } from '@/lib/rateLimit';
import { getPublicAvailabilitySlotsForDate } from '@/lib/availability';

const MIN_SCHEDULING_ADVANCE_HOURS = 2;

// GET /api/availability/slots?date=YYYY-MM-DD
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
        return NextResponse.json({ error: 'Parametro date e obrigatorio' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const rl = await rateLimit(`availability:slots:${ip}`, { limit: 30, windowSec: 60 });
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Muitas requisicoes' }, { status: 429 });
    }

    try {
        const result = await getPublicAvailabilitySlotsForDate(date, {
            minAdvanceHours: MIN_SCHEDULING_ADVANCE_HOURS,
        });
        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        return NextResponse.json({
            date: result.date,
            slots: result.slots,
            availableCount: result.availableCount,
            message: result.message,
        });
    } catch (error) {
        console.error('Error loading availability slots:', error);
        return NextResponse.json({ error: 'Erro ao carregar disponibilidade' }, { status: 500 });
    }
}
