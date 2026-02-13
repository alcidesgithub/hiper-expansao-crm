import { expect, test } from '@playwright/test';

test.describe('Funnel publico - smoke', () => {
    test('gate decisor persiste selecao e segue para funnel', async ({ page }) => {
        const gateRequests: Array<Record<string, unknown>> = [];

        await page.route('**/api/funnel/gate', async (route) => {
            const payload = route.request().postDataJSON() as Record<string, unknown>;
            gateRequests.push(payload);
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    sessionId: payload.sessionId || 'gate-session-e2e',
                }),
            });
        });

        await page.goto('/funnel/gate');
        await page.getByTestId('gate-option-decisor').click();
        await Promise.all([
            page.waitForURL('**/funnel?gate=decisor'),
            page.getByTestId('gate-continue').click(),
        ]);

        expect(gateRequests).toHaveLength(1);
        expect(gateRequests[0]).toMatchObject({
            choice: 'DECISOR',
            source: 'funnel_public_gate',
        });
        expect(typeof gateRequests[0]?.sessionId).toBe('string');

        const storage = await page.evaluate(() => ({
            approved: window.localStorage.getItem('funnel:gate:approved'),
            profile: window.localStorage.getItem('funnel:gate:profile'),
            sessionId: window.localStorage.getItem('funnel:gate:sessionId'),
        }));

        expect(storage.approved).toBe('true');
        expect(storage.profile).toBe('DECISOR');
        expect(storage.sessionId).toBeTruthy();
    });

    test('gate influenciador redireciona para trilha educativa', async ({ page }) => {
        await page.route('**/api/funnel/gate', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    sessionId: 'gate-session-e2e',
                }),
            });
        });

        await page.goto('/funnel/gate');
        await page.getByTestId('gate-option-influenciador').click();
        await Promise.all([
            page.waitForURL('**/funnel/educacao?perfil=influenciador'),
            page.getByTestId('gate-continue').click(),
        ]);

        const profile = await page.evaluate(() => window.localStorage.getItem('funnel:gate:profile'));
        expect(profile).toBe('INFLUENCIADOR');
    });

    test('resultado aprovado avanca para calendario e conclui agendamento', async ({ page }) => {
        const leadId = 'lead-e2e-1';
        const token = 'token-e2e-1234567890';
        let requestedDate = '';
        let bookingPayload: Record<string, unknown> | null = null;

        await page.route('**/api/schedule*', async (route) => {
            const request = route.request();
            const url = new URL(request.url());

            if (request.method() === 'GET') {
                requestedDate = url.searchParams.get('date') || '';
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        slots: [
                            {
                                time: '09:00',
                                available: true,
                                consultorId: 'consultor-1',
                                consultorName: 'Consultor E2E',
                            },
                            {
                                time: '10:00',
                                available: false,
                                consultorId: 'consultor-1',
                                consultorName: 'Consultor E2E',
                            },
                        ],
                    }),
                });
                return;
            }

            if (request.method() === 'POST') {
                bookingPayload = request.postDataJSON() as Record<string, unknown>;
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        meeting: {
                            date: bookingPayload.date,
                            time: bookingPayload.time,
                            consultorName: 'Consultor E2E',
                        },
                    }),
                });
                return;
            }

            await route.fallback();
        });

        await page.goto(`/funnel/resultado?grade=A&leadId=${leadId}&token=${token}`);
        await page.getByTestId('result-schedule-link').click();
        await page.waitForURL(`**/funnel/calendar?leadId=${leadId}&token=${token}`);

        const firstDateButton = page.locator('[data-testid^="date-"]').first();
        const dateTestId = await firstDateButton.getAttribute('data-testid');
        const selectedDate = dateTestId?.replace('date-', '') || '';
        expect(selectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        await firstDateButton.click();
        await expect(page.getByTestId('slot-09-00')).toBeVisible();
        await page.getByTestId('slot-09-00').click();
        await page.getByTestId('confirm-booking').click();

        await expect(page.getByText(/reuni[aã]o agendada com sucesso/i)).toBeVisible();
        expect(requestedDate).toBe(selectedDate);
        expect(bookingPayload).toMatchObject({
            leadId,
            token,
            consultorId: 'consultor-1',
            date: selectedDate,
            time: '09:00',
        });
    });
});
