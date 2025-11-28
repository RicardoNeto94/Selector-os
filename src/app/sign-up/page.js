"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function SignUpPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [birthday, setBirthday] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setMessage("Please fill in name, email and password.");
      return;
    }

    if (password !== passwordConfirm) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          // Store extra info in user_metadata
          data: {
            full_name: fullName.trim(),
            birthday: birthday || null,
            location: location || null,
          },
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/sign-in`
              : undefined,
        },
      });

      if (error) throw error;

      // If email confirmation is ON, there is no active session yet.
      // We ask user to check their inbox.
      if (!data.session) {
        setMessage(
          "Registration successful. Check your email to confirm your account, then sign in to continue onboarding."
        );
        return;
      }

      // If you ever disable email confirmation, you can send them straight
      // to onboarding when a session exists:
      router.push("/onboarding");
    } catch (err) {
      console.error("Sign-up error:", err);
      setMessage(err.message || "Failed to register. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/80 p-8 shadow-[0_24px_60px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
        <h1 className="text-2xl font-semibold text-slate-50 mb-2 text-center">
          Create your Selector<span className="text-emerald-400">OS</span> account
        </h1>
        <p className="text-xs text-slate-400 mb-6 text-center">
          Register once. After sign in, we&apos;ll guide you through
          onboarding to set up your first restaurant.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              placeholder="Ex: Ricardo Neto"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@restaurant.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirm password
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Birthday
              </label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input"
                placeholder="City, Country"
              />
            </div>
          </div>

          {message && (
            <p className="text-xs text-emerald-300/90 mt-1">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full button mt-4 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-[11px] text-slate-400 text-center">
          Already have an account?{" "}
          <a
            href="/sign-in"
            className="text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
