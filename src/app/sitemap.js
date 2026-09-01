export default function sitemap() {
  const routes = ["", "/pricing", "/faq", "/contact", "/privacy", "/cookies", "/terms", "/security", "/subprocessors", "/accessibility"];
  return routes.map((route) => ({
    url: `https://vaxeron.com${route}`,
    lastModified: new Date("2026-09-01"),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/pricing" ? 0.8 : 0.5,
  }));
}
