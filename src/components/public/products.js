export const products = {
  wine: {
    name: "Vaxeron Wine", href: "/wine", label: "For the cellar. For the service.",
    heading: "Every bottle has a place. Every list, a purpose.",
    intro: "Bring your catalogue, venue stock and digital wine lists into one considered workspace. Less searching between systems. More confidence at the table.",
    image: "wine-workspace",
    alt: "Vaxeron wine workspace with fictional Aurelia Hospitality inventory and cellar charts",
    caption: "Illustrative workspace · Fictional company and demonstration data",
    audience: "For sommeliers, restaurants and multi-venue wine teams",
    short: "From cellar visibility to the wine list in your guest’s hands.",
    highlights: ["Catalogue & stock", "Venue operations", "Digital wine lists"],
    detailTitle: "A clearer view of the cellar. A better way to serve it.",
    features: [
      ["Know what you have", "Keep wines, vintages, bottle formats and purchase prices together. See inventory by location, with unopened stock and open equivalents clearly distinguished."],
      ["Understand each venue", "Review venue availability, track movements and investigate stock discrepancies. See sales by venue when a supported sales integration is connected."],
      ["Publish with confidence", "Create a branded digital wine list, set bottle and by-the-glass offerings, and keep guest availability aligned with stock."],
      ["Stay ahead of service", "Review out-of-stock ordering suggestions and catalogue issues in context, with clear paths back to the records that need attention."],
    ],
    steps: [["Establish your catalogue", "Bring in the wines and locations your team works with."], ["Choose your stock source", "Manage stock manually or configure a supported integration."], ["Make it guest-ready", "Select the venue’s wines, refine the design and publish its digital list."]],
    note: "No POS integration? Start with manual stock management. Compucash connectivity is available for supported setups; integration scope is confirmed during onboarding.",
    cta: "Let’s talk about your wine operation.",
    other: "hospitality",
  },
  hospitality: {
    name: "Vaxeron Hospitality", href: "/hospitality", label: "Your property. Thoughtfully presented.",
    heading: "The whole stay. One considered experience.",
    intro: "Give guests an inviting way to discover dining, in-room delicacies and wellness. A digital experience that feels like your property—not another piece of software.",
    image: "room-experience",
    alt: "Illustrative Aurelia House in-room tablet showing dining, room service and wellness",
    caption: "Illustrative in-room experience · Fictional property and content",
    audience: "For hotels, hospitality groups and guest-experience teams",
    short: "Dining, in-room comforts and wellness, gathered around the guest.",
    highlights: ["In-room experiences", "Dining & wellness", "Brand-led publishing"],
    detailTitle: "Less friction for the guest. More room for hospitality.",
    features: [
      ["Welcome guests your way", "Bring your property’s visual identity into a composed guest home, with clear paths to the experiences and information they need."],
      ["Make discovery effortless", "Present dining destinations, room delicacies, spa treatments and seasonal offers in focused, easy-to-explore experiences."],
      ["Keep the details current", "Manage guest-facing content from the back office and refresh supported room tablets when menus or information change."],
      ["Consider the room, too", "Support an installed tablet experience, with a night-time idle screen for configured room experiences that softens the display when it is not in use."],
    ],
    steps: [["Shape the guest journey", "Choose the services and information that matter for your property."], ["Make it feel like you", "Configure the content and agree the visual direction for your guest experience."], ["Bring it into the room", "Publish the guest address and prepare the supported tablets or guest devices."]],
    note: "Guest experiences and device behaviour are configured for each property. Bespoke designs, booking connections and other integrations are scoped together—not assumed to be included.",
    cta: "Let’s imagine the experience for your property.",
    other: "wine",
  },
};

export function demoHref(name) {
  return `/contact?product=${name === "Vaxeron Wine" ? "Wine" : "Hospitality"}`;
}
