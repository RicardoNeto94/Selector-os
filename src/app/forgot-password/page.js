"use client";

import { useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import "../../styles/auth.css";

export default function ForgotPasswordPage() {
  const supabase = createClientComponentClient();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setSending(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // IMPORTANT: go through /auth/callback so the session is created,
      // then land on /update-password (which you already have)
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });

    setSending(false);

    if (error) {
      console.error(error);
      setMessage("Could not send reset email. Please try again.");
      return;
    }

    setMessage("If that email exists, a reset link has been sent.");
  }

  return (
    <div className="auth-root">
      <div className="auth-card">
        <div className="auth-card-logo-floating">
          <img
            src="/selectoros-logo.png"
            alt="SelectorOS logo"
            className="auth-card-logo-img-only"
          />
        </div>

        <h1 className="auth-title">Forgot your password?</h1>
        <p className="auth-subtitle">
          Enter the email you use for SelectorOS and we’ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <span className="auth-field-icon">✉️</span>
            <input
              className="auth-input"
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-primary-btn"
            disabled={sending}
          >
            {sending ? "Sending…" : "Send reset link"}
          </button>
        </form>

        {message && (
          <p className="auth-footer-text">
            {message}
          </p>
        )}

        <div className="auth-alt">
          <span>Remembered it?</span>
          <Link href="/sign-in" className="auth-alt-link">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
