import "../styles/globals.css";
import "../styles/theme.css";
import "../styles/sidebar.css";

export const metadata = {
  title: "SelectorOS",
  description: "Restaurant Menu & Allergen cockpit",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#050509] text-slate-100">
        {children}
      </body>
    </html>
  );
}
