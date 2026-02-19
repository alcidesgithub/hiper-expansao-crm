import { NextResponse } from 'next/server';
import { acquisitionEventSchema } from '@/lib/validation';
import { getClientIp, rateLimit } from '@/lib/rateLimit';
import { logAudit } from '@/lib/audit';

function isTrackingEnabled(): boolean {
    const value = process.env.ACQ_TRACKING_V1 ?? process.env.NEXT_PUBLIC_ACQ_TRACKING_V1;
    if (!value) return true;
    return value !== 'false' && value !== '0';
}

export async function POST(request: Request) {
    if (!isTrackingEnabled()) {
        return NextResponse.json({ success: true, disabled: true });
    }

    const ip = getClientIp(request);
    const rl = await rateLimit(`public:analytics:${ip}`, { limit: 60, windowSec: 60 });
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Muitas requisicoes' }, { status: 429 });
    }

    try {
        const body = await request.json();
        const parsed = acquisitionEventSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Payload invalido', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const payload = parsed.data;

        await logAudit({
            action: payload.eventName,
            entity: 'AcquisitionEvent',
            entityId: payload.sessionId,
            changes: {
                ...payload,
                ip,
                receivedAt: new Date().toISOString(),
            },
            ipAddress: ip,
            userAgent: request.headers.get('user-agent') || undefined,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error recording public acquisition analytics:', error);
        return NextResponse.json({ error: 'Erro ao registrar evento' }, { status: 500 });
    }
}
