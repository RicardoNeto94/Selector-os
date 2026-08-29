export const ROLE_ACCESS_DEFINITIONS = Object.freeze({
  administrator: {
    label: "Administrator",
    summary: "Full workspace administration, without ownership control.",
    allows: [
      "All venues and operational modules",
      "Wine, guest experience and inventory management",
      "Invite and remove non-owner team members",
      "Workspace settings and integrations",
    ],
    limits: [
      "Cannot remove, demote or replace the workspace owner",
      "Cannot access another customer workspace unless separately invited",
    ],
  },
  "fnb-manager": {
    label: "F&B Manager",
    summary: "Broad food, beverage and guest-experience operations.",
    allows: [
      "Dashboard and analytics",
      "Wine catalogue, stock, transfers and guest wine lists",
      "Dining, spa and merchandise content",
      "Only the venues assigned in the invitation",
    ],
    limits: [
      "Cannot manage users, roles, workspace settings or integrations",
      "Cannot access unassigned venues or another customer workspace",
    ],
  },
  "beverage-manager": {
    label: "Beverage Manager",
    summary: "Complete wine and beverage operations for assigned venues.",
    allows: [
      "Wine inventory, catalogue and transfers",
      "Bottle, by-the-glass and sake-pairing controls",
      "Wine menus and cellar activity",
      "Only the venues assigned in the invitation",
    ],
    limits: [
      "Cannot manage team access, settings or integrations",
      "Cannot manage unrelated dining, spa or merchandise content",
    ],
  },
  "venue-manager": {
    label: "Venue Manager",
    summary: "Guest-list operations for specifically assigned venues.",
    allows: [
      "View inventory and cellar activity for assigned venues",
      "Manage guest wine lists and by-the-glass presentation",
    ],
    limits: [
      "Cannot adjust global stock, transfer wine or edit the global catalogue",
      "Cannot manage team access, settings, integrations or unassigned venues",
    ],
  },
  waiter: {
    label: "Waiter",
    summary: "Read-only service access for specifically assigned venues.",
    allows: [
      "View the dashboard and current wine inventory",
      "See only the venues assigned in the invitation",
    ],
    limits: [
      "Cannot change stock, prices, menus, wines or guest content",
      "Cannot transfer wine or manage users, settings and integrations",
    ],
  },
});

export function getRoleAccessDefinition(slug) {
  return ROLE_ACCESS_DEFINITIONS[slug] || null;
}

const TENANT_ROLE_BY_ACCESS_ROLE = Object.freeze({
  administrator: "administrator",
  "fnb-manager": "manager",
  "beverage-manager": "manager",
  "venue-manager": "operator",
  waiter: "viewer",
});

export function getTenantRoleForAccessRole(slug) {
  return TENANT_ROLE_BY_ACCESS_ROLE[slug] || "viewer";
}
