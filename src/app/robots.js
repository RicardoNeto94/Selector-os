export default function robots() {
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/pricing", "/faq", "/contact", "/privacy", "/cookies", "/terms", "/security", "/subprocessors", "/accessibility"], disallow: ["/dashboard/", "/platform-admin/", "/invite/", "/api/"] },
    ],
    sitemap: "https://vaxeron.com/sitemap.xml",
  };
}
