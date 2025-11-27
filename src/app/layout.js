import "../styles/globals.css";
import "../styles/theme.css";
import "../styles/sidebar.css";

import Sidebar from "./components/Sidebar"; // Correct import

export const metadata = {
  title: "SelectorOS",
  description: "Restaurant menu & allergen cockpit",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">

          {/* SIDEBAR */}
          <Sidebar active="dashboard" />

          {/* MAIN AREA */}
          <main className="flex-1 p-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
