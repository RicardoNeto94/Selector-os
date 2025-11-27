import "../styles/globals.css";
import "../styles/theme.css";

export const dynamic = "force-dynamic";

export default async function RestaurantPublicLayout({ children, params }) {
  const slug = params.slug;

  // choose theme based on slug prefix
  const themeFile =
    slug.includes("shang") ? "theme-shangshi.css" :
    slug.includes("koyo") ? "theme-koyo.css" :
    "theme-modern.css";

  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href={`/r/${slug}/${themeFile}`} />
      </head>

      <body>
        <div className="container">
          {children}
        </div>
      </body>
    </html>
  );
}
