import test from "node:test";
import assert from "node:assert/strict";

import {
  getTenantRoleForAccessRole,
} from "../src/lib/access/roleDefinitions.js";
import {
  isProtectedWorkspaceOwner,
} from "../src/lib/access/ownership.js";

test("protects organization owners and the Vaxeron platform owner account", () => {
  assert.equal(isProtectedWorkspaceOwner({ membershipRole: "owner" }), true);
  assert.equal(isProtectedWorkspaceOwner({
    email: " RicardoNeto8@GMAIL.com ",
    membershipRole: "administrator",
  }), true);
  assert.equal(isProtectedWorkspaceOwner({
    email: "another.admin@example.com",
    membershipRole: "administrator",
  }), false);
});

test("maps invitation roles to least-privilege tenant roles", () => {
  assert.equal(getTenantRoleForAccessRole("administrator"), "administrator");
  assert.equal(getTenantRoleForAccessRole("fnb-manager"), "manager");
  assert.equal(getTenantRoleForAccessRole("beverage-manager"), "manager");
  assert.equal(getTenantRoleForAccessRole("venue-manager"), "operator");
  assert.equal(getTenantRoleForAccessRole("waiter"), "viewer");
  assert.equal(getTenantRoleForAccessRole("unknown-role"), "viewer");
});
