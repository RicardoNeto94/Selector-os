"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import "../../../styles/auth.css";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
    []
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [checkingLink, setCheckingLink] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let active = true;

    async function prepareRecoverySession() {
      const requestUrl = new URL(window.location.href);
      const code = requestUrl.searchParams.get("code");

      if (!code) {
        if (!active) return;

        setIsError(true);
        setMessage(
          "This password reset link is missing its recovery code. Please request a new link."
        );
        setCheckingLink(false);
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!active) return;

      if (error) {
        console.error("Password recovery code exchange failed:", error.message);

        setIsError(true);
        setMessage(
          "This password reset link is invalid or has expired. Please request a new link."
        );
        setCheckingLink(false);
        return;
      }

      window.history.replaceState(
        {},
        document.title,
        "/auth/update-password"
      );

      setRecoveryReady(true);
      setCheckingLink(false);
    }

    prepareRecoverySession();

    return () => {
      active = false;
    };
  }, [supabase]);

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    if (!recoveryReady) {
      setIsError(true);
      setMessage("The password reset session is not ready.");
      return;
    }

    if (password.length < 8) {
      setIsError(true);
      setMessage("Your new password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("The passwords do not match.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error("Password update failed:", error.message);

      setIsError(true);
      setMessage("Could not update your password. Please try again.");
      setSaving(false);
      return;
    }

    await supabase.auth.signOut();

    setMessage("Your password has been updated. Redirecting to sign in…");
    setSaving(false);

    window.setTimeout(() => {
      router.replace("/sign-in?password=updated");
    }, 1200);
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

        <h1 className="auth-title">Create a new password</h1>

        <p className="auth-subtitle">
          Choose a secure new password for your VAXERON account.
        </p>

        {checkingLink ? (
          <p className="auth-footer-text" role="status">
            Verifying your reset link…
          </p>
        ) : (
          <>
            {recoveryReady && (
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-field">
                  <input
                    className="auth-input"
                    type="password"
                    placeholder="New password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={saving}
                    minLength={8}
                    required
                  />
                </div>

                <div className="auth-field">
                  <input
                    className="auth-input"
                    type="password"
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    disabled={saving}
                    minLength={8}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="auth-primary-btn"
                  disabled={saving}
                >
                  {saving ? "Updating…" : "Update password"}
                </button>
              </form>
            )}

            {message && (
              <p
                className="auth-footer-text"
                role={isError ? "alert" : "status"}
              >
                {message}
              </p>
            )}

            {isError && (
              <div className="auth-alt">
                <Link href="/forgot-password" className="auth-alt-link">
                  Request a new reset link
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}