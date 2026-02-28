import { expect, test } from '@playwright/test';

test('redirects unauthenticated user from protected page to login with authRequired message', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login\?authRequired=1$/);
  await expect(page.getByText('Þú þarft að vera innskráð/ur til að skoða þessa síðu.')).toBeVisible();
});
