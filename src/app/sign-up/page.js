"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import "../../styles/auth.css";

export default function SignUpPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [birthday, setBirthday] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!fullName || !email || !password || !confirm) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            birthday,
            location,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      // After sign up, send them to sign-in or onboarding
      router.push("/sign-in");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to sign up.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-root">
      <div className="auth-card">
        {/* floating SelectorOS logo inside the card */}
        <div className="auth-card-logo-floating">
          <img
            src="/selectoros-logo.png"
            alt="SelectorOS logo"
            className="auth-card-logo-img-only"
          />
        </div>

        <h1 className="auth-title">
          Create your <span className="auth-title-accent">SelectorOS</span> account
        </h1>
        <p className="auth-subtitle">
          Register once. After sign in, we&apos;ll guide you through onboarding to set
          up your first restaurant.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* FULL NAME */}
          <div className="auth-field">
            <span className="auth-field-icon">👤</span>
            <input
              className="auth-input"
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          {/* EMAIL */}
          <div className="auth-field">
            <span className="auth-field-icon">✉️</span>
            <input
              className="auth-input"
              type="email"
              placeholder="Email (you@restaurant.com)"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* PASSWORD ROW */}
          <div className="auth-field-row">
            <div className="auth-field">
              <span className="auth-field-icon">🔒</span>
              <input
                className="auth-input"
                type="password"
                placeholder="Password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="auth-field">
              <span className="auth-field-icon">🔒</span>
              <input
                className="auth-input"
                type="password"
                placeholder="Confirm password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
          </div>

          {/* BIRTHDAY + LOCATION */}
          <div className="auth-field-row">
            <div className="auth-field">
              <span className="auth-field-icon">🎂</span>
              <input
                className="auth-input"
                type="date"
                placeholder="Birthday"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>
            <div className="auth-field">
              <span className="auth-field-icon">📍</span>
              <input
                className="auth-input"
                type="text"
                placeholder="Location (City, Country)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-primary-btn"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>

        {error && (
          <p className="auth-footer-text" style={{ color: "#b91c1c" }}>
            {error}
          </p>
        )}

        <div className="auth-alt">
          <span>Already have an account?</span>
          <Link href="/sign-in" className="auth-alt-link">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
