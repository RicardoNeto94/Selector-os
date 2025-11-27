import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import AuthProvider from "src/components/AuthProvider";
import "src/styles/globals.css";

export const revalidate = 0;

export default async function RootLayout({ children }) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f5f6fa] antialiased">
        {/* No centering, no flex constraints */}
        <AuthProvider accessToken={session?.access_token}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
