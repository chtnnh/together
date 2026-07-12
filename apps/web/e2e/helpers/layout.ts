import { expect, type Locator } from "@playwright/test";

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlapArea(a: Box, b: Box): number {
  const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return xOverlap * yOverlap;
}

/** Fails when two elements occupy the same screen space. */
export async function expectNoOverlap(left: Locator, right: Locator, tolerancePx = 2) {
  const leftBox = await left.boundingBox();
  const rightBox = await right.boundingBox();
  expect(leftBox, "left element should be visible").not.toBeNull();
  expect(rightBox, "right element should be visible").not.toBeNull();
  if (!leftBox || !rightBox) return;

  const overlap = overlapArea(leftBox, rightBox);
  expect(overlap).toBeLessThanOrEqual(tolerancePx * tolerancePx);
}

/** Left block should end before the right block starts (narrow header rows). */
export async function expectLeftBeforeRight(left: Locator, right: Locator, gapPx = 0) {
  const leftBox = await left.boundingBox();
  const rightBox = await right.boundingBox();
  expect(leftBox, "left element should be visible").not.toBeNull();
  expect(rightBox, "right element should be visible").not.toBeNull();
  if (!leftBox || !rightBox) return;

  expect(leftBox.x + leftBox.width).toBeLessThanOrEqual(rightBox.x + gapPx);
}
