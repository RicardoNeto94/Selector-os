import test from "node:test";
import assert from "node:assert/strict";
import { isBurmanNight, shouldShowBurmanNight } from "../src/lib/burman-night.mjs";

test("night schedule uses Tallinn time, including summer and winter offsets", () => {
  for (const [date, expected] of [
    ["2026-09-10T18:59:59Z", false], // 21:59 Tallinn
    ["2026-09-10T19:00:00Z", true],
    ["2026-09-11T03:59:59Z", true],
    ["2026-09-11T04:00:00Z", false],
    ["2026-12-10T19:59:59Z", false],
    ["2026-12-10T20:00:00Z", true],
    ["2026-12-11T05:00:00Z", false],
  ]) assert.equal(isBurmanNight(new Date(date)), expected, date);
});

test("waits 30 seconds, resets on activity and does not activate during daytime", () => {
  const night = Date.parse("2026-09-10T20:00:00Z");
  const day = Date.parse("2026-09-10T12:00:00Z");
  assert.equal(shouldShowBurmanNight(night, night - 29_999), false);
  assert.equal(shouldShowBurmanNight(night, night - 30_000), true);
  assert.equal(shouldShowBurmanNight(night, night - 1), false);
  assert.equal(shouldShowBurmanNight(day, day - 60_000), false);
  assert.equal(shouldShowBurmanNight(day, day - 30_000, true), true);
});
