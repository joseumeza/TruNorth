/**
 * Showcase golden path in offline demo mode (spec §15, §27 DoD #1 & #3):
 * W1 → W2 → (Option A, strong) → W3a → W4 3-tap climb → celebration,
 * with zero requests to /api/* along the way.
 */
import { expect, test, type Page } from '@playwright/test';

async function clickThroughNarration(page: Page): Promise<void> {
  const btn = page.locator('.narration-continue');
  await btn.waitFor({ state: 'visible', timeout: 15_000 });
  await btn.click();
}

async function clickThroughBubble(page: Page): Promise<void> {
  const bubble = page.locator('.bubble:not(.bubble-thinking)');
  await bubble.waitFor({ state: 'visible', timeout: 15_000 });
  await bubble.click(); // complete the progressive reveal
  await bubble.click(); // advance
}

async function walkRightUntil(page: Page, appears: string, maxMs = 8000): Promise<void> {
  await page.keyboard.down('ArrowRight');
  try {
    await page.locator(appears).waitFor({ state: 'visible', timeout: maxMs });
  } finally {
    await page.keyboard.up('ArrowRight');
  }
}

test('demo golden path completes offline with no API traffic', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) apiRequests.push(url.pathname);
  });

  await page.goto('/?demo=1');

  // Demo indicator is visible (spec §15.2).
  await expect(page.locator('.demo-pill')).toHaveText('Demo Mode');

  // W1: read narration, walk right to the exit trigger → W2.
  await clickThroughNarration(page);
  await walkRightUntil(page, '.narration-bar');

  // W2: narration, then walk to Robin → decision.
  await clickThroughNarration(page);
  await walkRightUntil(page, '.choice-panel');

  // Decision: pivot lock passes, pick Option A (strong).
  const optionA = page.locator('.choice-card').first();
  await expect(optionA).toBeEnabled({ timeout: 5000 });
  await optionA.click();
  await clickThroughBubble(page);

  // W3a: consequence scene → walk to the ladder → W4.
  await clickThroughNarration(page);
  await walkRightUntil(page, '.narration-bar');

  // W4: participatory climb — 3 taps (spec §22 Phase 2).
  await clickThroughNarration(page);
  const climb = page.locator('.climb-button');
  await climb.waitFor({ state: 'visible' });
  await climb.click();
  await climb.click();
  await climb.click();

  // Celebration → finale banner.
  const keepGoing = page.locator('.celebration .primary-button');
  await keepGoing.waitFor({ state: 'visible', timeout: 15_000 });
  await keepGoing.click();
  await expect(page.locator('.instruction-banner')).toContainText('The End');

  // DoD #3: no network request to the companion proxy in demo mode.
  expect(apiRequests).toEqual([]);
});
