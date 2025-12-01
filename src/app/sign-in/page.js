"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import "../../styles/auth.css";

export default function SignInPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in both fields.");
      return;
    }

    try {
      setLoading(true);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to sign in.");
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      {/* center card */}
      <div className="auth-card">
        {/* floating logo (no pill) */}
        <div className="auth-card-logo-floating">
          <img
            src="/selectoros-logo.png"
            alt="SelectorOS logo"
            className="auth-card-logo-img-only"
          />
        </div>

        <h1 className="auth-title">Sign in with email</h1>
        <p className="auth-subtitle">
          Access your SelectorOS cockpit to manage dishes, menus and allergens.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* EMAIL */}
          <div className="auth-field">
            <span className="auth-field-icon">✉️</span>
            <input
              className="auth-input"
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* PASSWORD */}
          <div className="auth-field">
            <span className="auth-field-icon">🔒</span>
            <input
              className="auth-input"
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="auth-password-row">
            <span />
            <a href="/forgot-password" className="auth-link">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className="auth-primary-btn"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Get Started"}
          </button>
        </form>

        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span>Or sign in with</span>
          <div className="auth-divider-line" />
        </div>

        <div className="auth-social-row">
          <button type="button" className="auth-social-btn">
            <span className="auth-social-icon">G</span>
            <span>Google</span>
          </button>
          <button type="button" className="auth-social-btn">
            <span className="auth-social-icon">f</span>
            <span>Facebook</span>
          </button>
          <button type="button" className="auth-social-btn">
            <span className="auth-social-icon"></span>
            <span>Apple</span>
          </button>
        </div>

        {error ? (
          <p className="auth-footer-text" style={{ color: "#b91c1c" }}>
            {error}
          </p>
        ) : (
          <p className="auth-footer-text">
            Protected access for restaurant operators only.
          </p>
        )}
      </div>
    </div>
  );
}
