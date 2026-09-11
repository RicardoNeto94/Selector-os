export default function sitemap() {
  const routes = ["", "/wine", "/hospitality", "/pricing", "/faq", "/contact", "/privacy", "/cookies", "/terms", "/security", "/subprocessors", "/accessibility"];
  return routes.map((route) => ({
    url: `https://vaxeron.com${route}`,
    lastModified: new Date(["", "/wine", "/hospitality"].includes(route) ? "2026-09-11" : "2026-09-01"),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : ["/pricing", "/wine", "/hospitality"].includes(route) ? 0.8 : 0.5,
  }));
}
