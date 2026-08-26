"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import "../../styles/auth.css";

const capabilitySummary = [
  {
    title: "Guest experiences",
    copy: "Keep menus, services and property information considered and current.",
  },
  {
    title: "Wine operations",
    copy: "Understand live availability, venue stock and guest-facing wine lists.",
  },
  {
    title: "Connected teams",
    copy: "Work from one shared operational picture with access shaped to your role.",
  },
];

function cleanText(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function expectedInvitationError(message) {
  const error = new Error(message);
  error.isExpectedInvitationState = true;
  return error;
}

export default function InvitePage() {
  const supabase = createClient();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [stage, setStage] = useState("introduction");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invitation, setInvitation] = useState({
    email: "",
    firstName: "",
    organizationName: "Your hospitality company",
    propertyName: "Your workspace",
    inviterName: "Your administrator",
    roleName: "Team member",
    venueCount: 0,
  });

  useEffect(() => {
    let active = true;

    async function initializeInvitation() {
      try {
        setChecking(true);
        setError("");
        let { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!data?.session) {
          await new Promise((resolve) => setTimeout(resolve, 700));
          const retry = await supabase.auth.getSession();
          if (retry.error) throw retry.error;
          data = retry.data;
        }

        const user = data?.session?.user;
        if (!user) {
          throw expectedInvitationError(
            "This invitation link is invalid or has expired."
          );
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("status")
          .eq("id", user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        if (profile?.status !== "pending") {
          throw expectedInvitationError(
            "This invitation has already been completed or is no longer active."
          );
        }

        const metadata = user.user_metadata || {};
        if (!active) return;
        setInvitation({
          email: user.email || "",
          firstName: cleanText(metadata.first_name, ""),
          organizationName: cleanText(
            metadata.organization_name,
            "Your hospitality company"
          ),
          propertyName: cleanText(metadata.property_name, "Your workspace"),
          inviterName: cleanText(metadata.invited_by_name, "Your administrator"),
          roleName: cleanText(metadata.role_name, "Team member"),
          venueCount: Number(metadata.venue_count) || 0,
        });
      } catch (inviteError) {
        if (!inviteError?.isExpectedInvitationState) {
          console.error("INVITATION SESSION ERROR:", inviteError);
        }
        if (active) {
          setError(inviteError?.message || "Unable to validate this invitation.");
        }
      } finally {
        if (active) setChecking(false);
      }
    }

    initializeInvitation();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function createPassword(event) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Create a password containing at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const user = data?.session?.user;
      if (!user?.id) throw new Error("Your invitation session has expired.");

      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw passwordError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (profileError) throw profileError;

      const { error: membershipError } = await supabase.rpc(
        "activate_current_memberships"
      );
      if (
        membershipError &&
        !["PGRST202", "42883"].includes(membershipError.code)
      ) {
        throw membershipError;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (passwordError) {
      console.error("INVITATION PASSWORD ERROR:", passwordError);
      setError(passwordError?.message || "Unable to complete your account.");
      setLoading(false);
    }
  }

  const greeting = invitation.firstName
    ? `Welcome, ${invitation.firstName}.`
    : "Welcome to Vaxeron.";

  return (
    <main className="vx-auth-login vx-invite-login">
      <section className="vx-auth-panel vx-invite-panel" aria-live="polite">
        <header className="vx-auth-header">
          <Link href="/" className="vx-auth-brand" aria-label="Vaxeron home">
            <img src="/selectoros-logo.png" alt="" />
            <span>VAXERON</span>
          </Link>
          <Link href="/sign-in" className="vx-auth-back">
            <ArrowLeftIcon aria-hidden="true" /> Sign in
          </Link>
        </header>

        <div className="vx-auth-form-wrap vx-invite-wrap">
          {checking ? (
            <InvitationStatus
              title="Preparing your invitation."
              copy="We are securely validating your access and workspace details."
              loading
            />
          ) : error && !invitation.email ? (
            <InvitationStatus title="This invitation needs attention." copy={error} />
          ) : stage === "introduction" ? (
            <>
              <div className="vx-auth-kicker"><span /> Invitation to collaborate</div>
              <h1 id="invite-title">{greeting}</h1>
              <p className="vx-auth-intro vx-invite-intro">
                <strong>{invitation.inviterName}</strong> invited you to join{" "}
                <strong>{invitation.propertyName}</strong> in Vaxeron—one connected
                workspace for refined guest experiences and hospitality operations.
              </p>

              <div className="vx-invite-context" aria-label="Invitation details">
                <div>
                  <span>Company</span>
                  <strong>{invitation.organizationName}</strong>
                </div>
                <div>
                  <span>Workspace</span>
                  <strong>{invitation.propertyName}</strong>
                </div>
                <div>
                  <span>Your access</span>
                  <strong>{invitation.roleName}</strong>
                </div>
              </div>

              <div className="vx-invite-capabilities">
                {capabilitySummary.map((item) => (
                  <div key={item.title}>
                    <CheckIcon aria-hidden="true" />
                    <p><strong>{item.title}</strong>{item.copy}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="vx-auth-submit"
                onClick={() => {
                  setError("");
                  setStage("account");
                }}
              >
                <span>Continue to create account</span>
                <ArrowRightIcon aria-hidden="true" />
              </button>

              <p className="vx-invite-fineprint">
                This invitation is intended for {invitation.email}. Access remains
                governed by {invitation.organizationName}.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                className="vx-invite-step-back"
                onClick={() => {
                  setError("");
                  setStage("introduction");
                }}
              >
                <ArrowLeftIcon aria-hidden="true" /> Invitation overview
              </button>
              <div className="vx-auth-kicker"><span /> Secure your access</div>
              <h1>Create your account.</h1>
              <p className="vx-auth-intro">
                Choose a private password to enter the {invitation.propertyName}
                workspace as {invitation.roleName.toLowerCase()}.
              </p>

              <form onSubmit={createPassword} className="vx-auth-form" noValidate>
                <label className="vx-auth-field">
                  <span>Email address</span>
                  <input type="email" value={invitation.email} disabled readOnly />
                </label>

                <label className="vx-auth-field">
                  <span>Create password</span>
                  <span className="vx-auth-password-control">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={loading}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                  </span>
                </label>

                <label className="vx-auth-field">
                  <span>Confirm password</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={loading}
                  />
                </label>

                {error && <div className="vx-auth-error" role="alert">{error}</div>}

                <button type="submit" className="vx-auth-submit" disabled={loading}>
                  <span>{loading ? "Creating secure access…" : "Enter Vaxeron"}</span>
                  {!loading && <ArrowRightIcon aria-hidden="true" />}
                </button>
              </form>

              <div className="vx-auth-trust">
                <LockClosedIcon aria-hidden="true" />
                <p><strong>Protected workspace</strong>Your account is secured by authenticated sessions and role-based permissions.</p>
              </div>
            </>
          )}
        </div>

        <footer className="vx-auth-footer">
          <span>© {new Date().getFullYear()} VAXERON</span>
          <span>Hospitality, thoughtfully connected.</span>
        </footer>
      </section>

      <aside className="vx-auth-story vx-invite-story" aria-label="About Vaxeron">
        <img
          src="/vaxeron/hospitality-arrival.png"
          alt="A refined contemporary hospitality interior"
        />
        <div className="vx-auth-story-shade" />
        <div className="vx-auth-story-copy">
          <span>Inside {invitation.propertyName}</span>
          <blockquote>Thoughtful service begins with everyone seeing the same clear picture.</blockquote>
          <p>Guest journeys · Wine operations · Connected teams</p>
        </div>
        <div className="vx-auth-story-index">V / INVITE</div>
      </aside>
    </main>
  );
}

function InvitationStatus({ title, copy, loading = false }) {
  return (
    <div className="vx-invite-status">
      <div className={loading ? "vx-invite-status-mark is-loading" : "vx-invite-status-mark"}>
        <LockClosedIcon aria-hidden="true" />
      </div>
      <div className="vx-auth-kicker"><span /> Private invitation</div>
      <h1>{title}</h1>
      <p className="vx-auth-intro">{copy}</p>
      {!loading && (
        <Link className="vx-auth-submit" href="/sign-in">
          <span>Return to sign in</span>
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
