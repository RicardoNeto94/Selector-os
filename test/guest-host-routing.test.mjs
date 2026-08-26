import assert from "node:assert/strict";
import test from "node:test";

import {
  getGuestHostConfig,
  isGuestSafeMethod,
  isPrivatePath,
  normalizeHostname,
} from "../src/lib/tenancy/guestHosts.js";

test("normalizes production and local hostnames", () => {
  assert.equal(normalizeHostname("Koyo.Vaxeron.com:443"), "koyo.vaxeron.com");
  assert.equal(normalizeHostname("spa.localhost:3000"), "spa.localhost");
});

test("maps every public guest PWA", () => {
  assert.equal(getGuestHostConfig("burman.vaxeron.com")?.destination, "/menu/burman-hotel");
  assert.equal(getGuestHostConfig("spa.vaxeron.com")?.destination, "/spa/burman");
  assert.equal(getGuestHostConfig("shangshi.vaxeron.com")?.destination, "/wine/shang-shi-wine");
  assert.equal(getGuestHostConfig("koyo.localhost:3000")?.destination, "/wine/koyo-wine");
  assert.equal(getGuestHostConfig("vaxeron.com"), null);
});

test("guest hosts reject private Vaxeron surfaces", () => {
  for (const pathname of [
    "/dashboard",
    "/dashboard/wines",
    "/api/compucash/status",
    "/api/cron/compucash",
    "/api/team/invite",
    "/api/wines/descriptions",
    "/sign-in",
  ]) {
    assert.equal(isPrivatePath(pathname), true, pathname);
  }

  for (const pathname of [
    "/",
    "/wine/koyo-wine",
    "/api/wine-menu/koyo-wine",
    "/manifest.webmanifest",
  ]) {
    assert.equal(isPrivatePath(pathname), false, pathname);
  }
});

test("guest hosts are read-only at the HTTP boundary", () => {
  assert.equal(isGuestSafeMethod("GET"), true);
  assert.equal(isGuestSafeMethod("HEAD"), true);
  assert.equal(isGuestSafeMethod("OPTIONS"), true);
  assert.equal(isGuestSafeMethod("POST"), false);
  assert.equal(isGuestSafeMethod("PATCH"), false);
  assert.equal(isGuestSafeMethod("DELETE"), false);
});
