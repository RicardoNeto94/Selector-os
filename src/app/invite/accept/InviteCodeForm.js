"use client";

import { useMemo, useState } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function normalizeCode(value) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function invitationErrorMessage(error) {
  const message = error?.message?.toLowerCase() || "";

  if (message.includes("expired")) {
    return "That invitation code has expired. Ask your administrator to resend the invitation, then use the code from the newest email.";
  }

  if (message.includes("invalid") || message.includes("token")) {
    return "That email and invitation code do not match. Use the code from the newest invitation email.";
  }

  if (message.includes("rate") || error?.status === 429) {
    return "Too many verification attempts were made. Wait a moment, then try the newest invitation code again.";
  }

  return "Vaxeron could not verify this invitation. Check the email and newest code, then try again.";
}

export default function InviteCodeForm({ initialError = false }) {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(
    initialError
      ? "That code is invalid or has expired. Use the code from the newest invitation email."
      : ""
  );
  const [loading, setLoading] = useState(false);

  async function verifyInvitation(event) {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(email);
    const normalizedCode = normalizeCode(code);

    setError("");
    if (normalizedCode.length < 6) {
      setError("Enter the complete invitation code from your newest email.");
      return;
    }

    try {
      setLoading(true);

      // Verification happens in the browser that will finish onboarding. This
      // lets Supabase persist the new session directly instead of relying on a
      // server redirect to transfer authentication cookies.
      const { data, error: verificationError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedCode,
        type: "invite",
      });

      if (verificationError) throw verificationError;
      if (!data?.session?.access_token || !data?.user) {
        throw new Error("Invitation verification did not create an account session.");
      }

      // Validate that this authenticated user still has a pending Vaxeron
      // membership before opening the account-creation screen.
      const validationResponse = await fetch("/api/team/activate", {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
        cache: "no-store",
      });
      const validation = await validationResponse.json().catch(() => ({}));

      if (!validationResponse.ok) {
        await supabase.auth.signOut();
        throw new Error(
          validation?.error || "This invitation is no longer active."
        );
      }

      // A full navigation lets the onboarding page read the freshly persisted
      // browser session without a React render or cookie propagation race.
      window.location.assign("/invite");
    } catch (verificationError) {
      setError(invitationErrorMessage(verificationError));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={verifyInvitation} className="vx-auth-form" noValidate>
      <label className="vx-auth-field">
        <span>Email address</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="name@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoFocus
          disabled={loading}
        />
      </label>
      <label className="vx-auth-field vx-invite-code-field">
        <span>Invitation code</span>
        <input
          type="text"
          name="otp_code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6,10}"
          minLength={6}
          maxLength={10}
          placeholder="000000"
          value={code}
          onChange={(event) => setCode(normalizeCode(event.target.value))}
          required
          disabled={loading}
        />
      </label>
      {error && (
        <div className="vx-auth-error" role="alert">
          {error}
        </div>
      )}
      <button type="submit" className="vx-auth-submit" disabled={loading}>
        <span>{loading ? "Verifying invitation…" : "Verify and continue"}</span>
        <ArrowRightIcon aria-hidden="true" />
      </button>
      <p className="vx-invite-code-help">
        Resent invitations create a new code. Only the code in the newest email
        will work.
      </p>
    </form>
  );
}
