export const dynamic = "force-dynamic";

// Use the public theme system for restaurant views
import "./theme.css";
import "./theme-shangshi.css"; // For now: always Shang Shi look

export default function RestaurantPublicLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {/* Full-width, full-height canvas for the themed tool */}
        <main className="min-h-screen flex items-stretch justify-center px-4 py-6">
          <div className="w-full max-w-6xl">{children}</div>
        </main>
      </body>
    </html>
  );
}
