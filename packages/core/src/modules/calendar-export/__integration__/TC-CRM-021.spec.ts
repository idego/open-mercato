import { expect, test } from '@playwright/test';
import {
  createCompanyFixture,
  createDealFixture,
  deleteEntityIfExists,
} from '@open-mercato/core/modules/core/__integration__/helpers/crmFixtures';
import { getAuthToken } from '@open-mercato/core/modules/core/__integration__/helpers/api';
import { login } from '@open-mercato/core/modules/core/__integration__/helpers/auth';

/**
 * TC-CRM-021: Add to Calendar button on Deal detail page (admin)
 * Source: .ai/specs/SPEC-034-2026-02-21-add-to-calendar.md
 */
test.describe('TC-CRM-021: Add to Calendar button on Deal detail page', () => {
  test('should show Add to Calendar button for admin and open dialog with date/time/duration fields', async ({
    page,
    request,
  }) => {
    let token: string | null = null;
    let companyId: string | null = null;
    let dealId: string | null = null;

    const companyName = `QA TC-CRM-021 Co ${Date.now()}`;
    const dealTitle = `QA TC-CRM-021 Deal ${Date.now()}`;

    try {
      token = await getAuthToken(request, 'admin');
      companyId = await createCompanyFixture(request, token, companyName);
      dealId = await createDealFixture(request, token, {
        title: dealTitle,
        companyIds: [companyId],
      });

      await login(page, 'admin');
      await page.goto(`/backend/customers/deals/${dealId}`);

      const calendarButton = page.getByRole('button', { name: /Add to Calendar/i });
      await expect(calendarButton).toBeVisible();

      await calendarButton.click();

      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('dialog').getByText(/Schedule Follow-up/i)).toBeVisible();

      await expect(page.getByLabel(/Date/i).first()).toBeVisible();
      await expect(page.getByLabel(/Time/i).first()).toBeVisible();

      await expect(page.getByText(/30 min/i).first()).toBeVisible();

      await expect(page.getByText(/Follow-up:/i)).toBeVisible();

      await expect(page.getByRole('button', { name: /Download .ics/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Google Cal/i })).toBeVisible();
    } finally {
      await deleteEntityIfExists(request, token, '/api/customers/deals', dealId);
      await deleteEntityIfExists(request, token, '/api/customers/companies', companyId);
    }
  });
});
