import { expect, test } from '@playwright/test';
import {
  createCompanyFixture,
  createPersonFixture,
  deleteEntityIfExists,
} from '@open-mercato/core/modules/core/__integration__/helpers/crmFixtures';
import { getAuthToken } from '@open-mercato/core/modules/core/__integration__/helpers/api';
import { login } from '@open-mercato/core/modules/core/__integration__/helpers/auth';

/**
 * TC-CRM-022: Add to Calendar button on Person detail page (employee)
 * Source: .ai/specs/SPEC-034-2026-02-21-add-to-calendar.md
 */
test.describe('TC-CRM-022: Add to Calendar button on Person detail page (employee)', () => {
  test('should show Add to Calendar button for employee and open dialog with person name in preview', async ({
    page,
    request,
  }) => {
    let token: string | null = null;
    let companyId: string | null = null;
    let personId: string | null = null;

    const companyName = `QA TC-CRM-022 Co ${Date.now()}`;
    const firstName = 'QA022';
    const lastName = `Person${Date.now()}`;
    const displayName = `${firstName} ${lastName}`;

    try {
      token = await getAuthToken(request, 'employee');
      companyId = await createCompanyFixture(request, token, companyName);
      personId = await createPersonFixture(request, token, {
        firstName,
        lastName,
        displayName,
        companyEntityId: companyId,
      });

      await login(page, 'employee');
      await page.goto(`/backend/customers/people/${personId}`);

      const calendarButton = page.getByRole('button', { name: /Add to Calendar/i });
      await expect(calendarButton).toBeVisible();

      await calendarButton.click();

      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('dialog').getByText(/Schedule Follow-up/i)).toBeVisible();

      await expect(page.getByText(new RegExp(firstName, 'i'))).toBeVisible();

      await expect(page.getByRole('button', { name: /Download .ics/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Google Cal/i })).toBeVisible();
    } finally {
      await deleteEntityIfExists(request, token, '/api/customers/people', personId);
      await deleteEntityIfExists(request, token, '/api/customers/companies', companyId);
    }
  });
});
