import "../styles/globals.css";
import "../styles/theme.css";
import "../styles/sidebar.css";

export const metadata = {
  title: "SelectorOS",
  description: "Restaurant menu & allergen cockpit",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-100">
        {children}
      </body>
    </html>
  );
}
