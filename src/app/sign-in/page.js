"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon, EyeIcon, EyeSlashIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import "../../styles/auth.css";

export default function SignInPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email address and password to continue.");
      return;
    }

    try {
      setLoading(true);
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw signInError;
      router.push("/dashboard");
      router.refresh();
    } catch (signInError) {
      console.error(signInError);
      setError("We could not sign you in. Check your details and try again.");
      setLoading(false);
    }
  };

  return (
    <main className="vx-auth-login">
      <section className="vx-auth-panel" aria-labelledby="sign-in-title">
        <header className="vx-auth-header">
          <Link href="/" className="vx-auth-brand" aria-label="Vaxeron home">
            <img src="/selectoros-logo.png" alt="" />
            <span>VAXERON</span>
          </Link>
          <Link href="/" className="vx-auth-back"><ArrowLeftIcon aria-hidden="true" />Home</Link>
        </header>

        <div className="vx-auth-form-wrap">
          <div className="vx-auth-kicker"><span /> Private workspace</div>
          <h1 id="sign-in-title">Welcome back.</h1>
          <p className="vx-auth-intro">Sign in to manage guest experiences, wine programmes and hospitality operations.</p>

          <form onSubmit={handleSubmit} className="vx-auth-form" noValidate>
            <label className="vx-auth-field">
              <span>Email address</span>
              <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck="false" placeholder="name@company.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} autoFocus />
            </label>

            <label className="vx-auth-field">
              <span>Password</span>
              <span className="vx-auth-password-control">
                <input type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </span>
            </label>

            <div className="vx-auth-form-meta">
              <span>Authorised team members only</span>
              <Link href="/forgot-password">Forgot password?</Link>
            </div>

            {error && <div className="vx-auth-error" role="alert">{error}</div>}

            <button type="submit" className="vx-auth-submit" disabled={loading}>
              <span>{loading ? "Signing in…" : "Enter workspace"}</span>
              {!loading && <ArrowRightIcon aria-hidden="true" />}
            </button>
          </form>

          <div className="vx-auth-trust">
            <LockClosedIcon aria-hidden="true" />
            <p><strong>Protected access</strong>Your workspace is secured by authenticated sessions and role-based permissions.</p>
          </div>

          <p className="vx-auth-access">Exploring Vaxeron for your property? <Link href="/#access">Request access</Link></p>
        </div>

        <footer className="vx-auth-footer">
          <span>© {new Date().getFullYear()} VAXERON</span>
          <span>Hospitality, thoughtfully connected.</span>
        </footer>
      </section>

      <aside className="vx-auth-story" aria-label="Vaxeron hospitality platform">
        <img src="/vaxeron/hospitality-arrival.png" alt="A refined contemporary hospitality interior at night" />
        <div className="vx-auth-story-shade" />
        <div className="vx-auth-story-copy">
          <span>Hospitality operating system</span>
          <blockquote>One quiet intelligence behind every considered guest experience.</blockquote>
          <p>Guest journeys · Wine operations · Connected teams</p>
        </div>
        <div className="vx-auth-story-index">V / 01</div>
      </aside>
    </main>
  );
}
