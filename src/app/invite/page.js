"use client";

export const dynamic = "force-dynamic";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createClientComponentClient,
} from "@supabase/auth-helpers-nextjs";

import "../../styles/auth.css";

export default function InvitePage() {
  const supabase =
    createClientComponentClient();

  const router = useRouter();

  const [checking, setChecking] =
    useState(true);

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [userEmail, setUserEmail] =
    useState("");

  useEffect(() => {
    initializeInvitation();
  }, []);

  async function initializeInvitation() {
    try {
      setChecking(true);
      setError("");

      /*
       * Supabase invitation links can return
       * authentication values in the URL hash.
       *
       * The browser Supabase client detects
       * those values and establishes the
       * invited user's session.
       */

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      let session =
        sessionData?.session;

      /*
       * Give Supabase a moment to process
       * the invitation hash if the session
       * is not available immediately.
       */

      if (!session) {
        await new Promise((resolve) =>
          setTimeout(resolve, 700)
        );

        const {
          data: retryData,
          error: retryError,
        } =
          await supabase.auth.getSession();

        if (retryError) {
          throw retryError;
        }

        session =
          retryData?.session;
      }

      if (!session?.user) {
        throw new Error(
          "This invitation link is invalid or has expired."
        );
      }

      setUserEmail(
        session.user.email || ""
      );
    } catch (inviteError) {
      console.error(
        "INVITATION SESSION ERROR:",
        inviteError
      );

      setError(
        inviteError?.message ||
          "Unable to validate this invitation."
      );
    } finally {
      setChecking(false);
    }
  }

  async function createPassword(event) {
    event.preventDefault();

    setError("");

    if (!password) {
      setError(
        "Create a password to continue."
      );

      return;
    }

    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );

      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );

      return;
    }

    try {
      setLoading(true);

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const user =
        sessionData?.session?.user;

      if (!user?.id) {
        throw new Error(
          "Your invitation session has expired."
        );
      }

      /* ===============================================
         CREATE PASSWORD
      =============================================== */

      const {
        error: passwordError,
      } = await supabase.auth.updateUser({
        password,
      });

      if (passwordError) {
        throw passwordError;
      }

      /* ===============================================
         ACTIVATE PROFILE
      =============================================== */

      const {
        error: profileError,
      } = await supabase
        .from("profiles")
        .update({
          status: "active",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) {
        throw profileError;
      }

      /* ===============================================
         COMPLETE
      =============================================== */

      router.replace("/dashboard");
      router.refresh();
    } catch (passwordError) {
      console.error(
        "INVITATION PASSWORD ERROR:",
        passwordError
      );

      setError(
        passwordError?.message ||
          "Unable to complete your account."
      );

      setLoading(false);
    }
  }

  if (checking) {
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

          <h1 className="auth-title">
            Preparing your access
          </h1>

          <p className="auth-subtitle">
            Validating your VAXERON
            invitation.
          </p>

          <p className="auth-footer-text">
            Please wait…
          </p>
        </div>
      </div>
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

        <h1 className="auth-title">
          Create your password
        </h1>

        <p className="auth-subtitle">
          Complete your VAXERON account
          and access your hospitality
          workspace.
        </p>

        {userEmail && (
          <div
            style={{
              marginBottom: "18px",
              fontSize: "11px",
              opacity: 0.65,
              textAlign: "center",
            }}
          >
            {userEmail}
          </div>
        )}

        {!error || userEmail ? (
          <form
            onSubmit={createPassword}
            className="auth-form"
          >
            <div className="auth-field">
              <span className="auth-field-icon">
                🔒
              </span>

              <input
                className="auth-input"
                type="password"
                placeholder="Create password"
                autoComplete="new-password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
              />
            </div>

            <div className="auth-field">
              <span className="auth-field-icon">
                🔒
              </span>

              <input
                className="auth-input"
                type="password"
                placeholder="Confirm password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
              />
            </div>

            <button
              type="submit"
              className="auth-primary-btn"
              disabled={loading}
            >
              {loading
                ? "Creating access…"
                : "Complete Account"}
            </button>
          </form>
        ) : null}

        {error && (
          <p
            className="auth-footer-text"
            style={{
              color: "#b91c1c",
            }}
          >
            {error}
          </p>
        )}

        {!error && (
          <p className="auth-footer-text">
            Protected access for VAXERON
            hospitality operators.
          </p>
        )}
      </div>
    </div>
  );
}