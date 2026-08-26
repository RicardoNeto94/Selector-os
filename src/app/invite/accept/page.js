import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import "../../../styles/auth.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Accept invitation | Vaxeron",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

function validTokenHash(value) {
  return typeof value === "string" && value.length >= 20 && value.length <= 512 && !/\s/.test(value);
}

export default async function AcceptInvitationPage({ searchParams }) {
  const params = await searchParams;
  const tokenHash = params?.token_hash;
  const error = params?.error;
  const verificationType = params?.type === "recovery" ? "recovery" : "invite";
  const canAccept = validTokenHash(tokenHash) && !error;
  const codeError = error === "invalid_code";
  const showCodeEntry = verificationType === "invite" && !canAccept;

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
          <div className="vx-invite-status">
            <div className="vx-invite-status-mark">
              <LockClosedIcon aria-hidden="true" />
            </div>
            <div className="vx-auth-kicker"><span /> Private invitation</div>
            <h1>
              {canAccept
                ? "Your invitation is ready."
                : showCodeEntry
                  ? "Enter your invitation code."
                  : "This invitation needs attention."}
            </h1>
            <p className="vx-auth-intro">
              {canAccept
                ? "Confirm that you want to accept this private Vaxeron invitation. Your secure account session will only be created after you continue."
                : showCodeEntry
                  ? "Use the email address and invitation code shown in your email. The code is verified only after you submit it here."
                  : "This invitation link is invalid, expired or has already been used. Ask the workspace administrator to send a new invitation."}
            </p>

            {canAccept ? (
              <form method="post" action="/api/auth/accept-invite">
                <input type="hidden" name="token_hash" value={tokenHash} />
                <input type="hidden" name="verification_type" value={verificationType} />
                <button type="submit" className="vx-auth-submit">
                  <span>{verificationType === "recovery" ? "Continue securely" : "Accept invitation"}</span>
                  <ArrowRightIcon aria-hidden="true" />
                </button>
              </form>
            ) : showCodeEntry ? (
              <form method="post" action="/api/auth/accept-invite" className="vx-auth-form">
                <input type="hidden" name="verification_type" value="invite" />
                <label className="vx-auth-field">
                  <span>Email address</span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    required
                    autoFocus
                  />
                </label>
                <label className="vx-auth-field vx-invite-code-field">
                  <span>Invitation code</span>
                  <input
                    type="text"
                    name="otp_code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6,8}"
                    minLength={6}
                    maxLength={8}
                    placeholder="00000000"
                    required
                  />
                </label>
                {codeError && (
                  <div className="vx-auth-error" role="alert">
                    That code is invalid or has expired. Check the newest invitation email or ask your administrator to resend it.
                  </div>
                )}
                <button type="submit" className="vx-auth-submit">
                  <span>Verify and continue</span>
                  <ArrowRightIcon aria-hidden="true" />
                </button>
              </form>
            ) : (
              <Link className="vx-auth-submit" href="/sign-in">
                <span>Return to sign in</span>
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            )}

            {(canAccept || showCodeEntry) && (
              <p className="vx-invite-fineprint">
                The one-time credential is consumed only when this secure form is submitted, protecting it from automated email security scanners.
              </p>
            )}
          </div>
        </div>

        <footer className="vx-auth-footer">
          <span>© {new Date().getFullYear()} VAXERON</span>
          <span>Hospitality, thoughtfully connected.</span>
        </footer>
      </section>

      <aside className="vx-auth-story vx-invite-story" aria-label="About Vaxeron">
        <img src="/vaxeron/hospitality-arrival.png" alt="A refined contemporary hospitality interior" />
        <div className="vx-auth-story-shade" />
        <div className="vx-auth-story-copy">
          <span>Protected access</span>
          <blockquote>Thoughtful service begins with everyone seeing the same clear picture.</blockquote>
          <p>Guest journeys · Wine operations · Connected teams</p>
        </div>
        <div className="vx-auth-story-index">V / INVITE</div>
      </aside>
    </main>
  );
}
