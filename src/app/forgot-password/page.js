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

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setSending(true);

    const redirectTo = `${window.location.origin}/auth/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setSending(false);

    if (error) {
      console.error("Password reset request failed:", error.message);
      setMessage("Could not send the reset email. Please try again.");
      return;
    }

    setMessage(
      "If an account exists for that email, a new password reset link has been sent."
    );
  }

  return (
    <div className="auth-root">
      <div className="auth-card">
        <div className="auth-card-logo-floating">
          <img
            src="/selectoros-logo.png"
            alt="VAXERON"
            className="auth-card-logo-img-only"
          />
        </div>

        <h1 className="auth-title">Forgot your password?</h1>

        <p className="auth-subtitle">
          Enter your account email and we’ll send you a secure password reset
          link.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <span className="auth-field-icon" aria-hidden="true">
              ✉️
            </span>

            <input
              className="auth-input"
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={sending}
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
          <p className="auth-footer-text" role="status">
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