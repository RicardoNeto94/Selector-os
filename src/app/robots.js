export default function robots() {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/dashboard", "/platform-admin", "/invite", "/api/", "/sign-in", "/sign-up", "/access-pending", "/auth/", "/wine/", "/menu/", "/spa/", "/r/"] },
    ],
    sitemap: "https://vaxeron.com/sitemap.xml",
  };
}
