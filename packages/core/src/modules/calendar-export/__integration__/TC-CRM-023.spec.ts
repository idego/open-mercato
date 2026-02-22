import { expect, test } from '@playwright/test';
import {
  createCompanyFixture,
  createDealFixture,
  deleteEntityIfExists,
} from '@open-mercato/core/modules/core/__integration__/helpers/crmFixtures';
import { getAuthToken, apiRequest } from '@open-mercato/core/modules/core/__integration__/helpers/api';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * TC-CRM-023: Calendar ICS API returns valid file
 * Source: .ai/specs/SPEC-034-2026-02-21-add-to-calendar.md
 */
test.describe('TC-CRM-023: Calendar ICS API endpoint', () => {
  test('should return valid ICS content for an authenticated deal request', async ({ request }) => {
    let token: string | null = null;
    let companyId: string | null = null;
    let dealId: string | null = null;

    const companyName = `QA TC-CRM-023 Co ${Date.now()}`;
    const dealTitle = `QA TC-CRM-023 Deal ${Date.now()}`;

    try {
      token = await getAuthToken(request, 'admin');
      companyId = await createCompanyFixture(request, token, companyName);
      dealId = await createDealFixture(request, token, {
        title: dealTitle,
        companyIds: [companyId],
      });

      const params = new URLSearchParams({
        entity: 'deal',
        id: dealId,
        date: '2026-03-01',
        time: '10:00',
        duration: '30',
        timezone: 'Europe/Warsaw',
      });

      const response = await apiRequest(request, 'GET', `/api/calendar-export/ics?${params}`, { token });

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toMatch(/text\/calendar/);

      const body = await response.text();
      expect(body).toContain('BEGIN:VCALENDAR');
      expect(body).toContain('BEGIN:VEVENT');
      expect(body).toContain('END:VEVENT');
      expect(body).toContain('END:VCALENDAR');
      expect(body).toContain('TZID=Europe/Warsaw');
      expect(body).toContain('20260301');
    } finally {
      await deleteEntityIfExists(request, token, '/api/customers/deals', dealId);
      await deleteEntityIfExists(request, token, '/api/customers/companies', companyId);
    }
  });

  test('should return 401 for unauthenticated request', async ({ request }) => {
    const params = new URLSearchParams({
      entity: 'deal',
      id: '00000000-0000-0000-0000-000000000000',
      date: '2026-03-01',
      time: '10:00',
      duration: '30',
      timezone: 'Europe/Warsaw',
    });

    const response = await request.get(`${BASE_URL}/api/calendar-export/ics?${params}`);
    expect(response.status()).toBe(401);
  });

  test('should return 404 for a non-existent deal ID', async ({ request }) => {
    const token = await getAuthToken(request, 'admin');

    const params = new URLSearchParams({
      entity: 'deal',
      id: '00000000-0000-0000-0000-000000000000',
      date: '2026-03-01',
      time: '10:00',
      duration: '30',
      timezone: 'Europe/Warsaw',
    });

    const response = await apiRequest(request, 'GET', `/api/calendar-export/ics?${params}`, { token });
    expect(response.status()).toBe(404);
  });
});
