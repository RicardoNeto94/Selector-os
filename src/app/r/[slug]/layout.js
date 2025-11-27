export const dynamic = "force-dynamic";

import "../../styles/theme.css";

export default function RestaurantPublicLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-white min-h-screen">
        <main className="w-full max-w-4xl mx-auto py-10 px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
