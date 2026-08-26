# Vaxeron invitation email setup

Vaxeron passes the inviting organization, property, administrator and assigned
role to Supabase Auth as invitation metadata. The hosted Supabase project must
use the matching HTML template for those details to appear in the email.

## Hosted Supabase

1. Open **Authentication → Email Templates → Invite user**.
2. Set the subject to `Your private invitation to Vaxeron`.
3. Replace the message body with the complete contents of
   `supabase/templates/invite.html`.
4. Save the template.
5. Under **Authentication → URL Configuration**, confirm that
   `https://vaxeron.com/invite` is an allowed redirect URL.

New invitations will then include:

- the Vaxeron identity and logo;
- the company and property that issued the invitation;
- the administrator who invited the recipient;
- the assigned role;
- a short explanation of Vaxeron;
- a secure acceptance button using Supabase's `ConfirmationURL`.

Existing emails cannot be restyled after they have already been sent. Resend
the invitation if a recipient needs the new template or if the original link
has expired.

## Security notes

- Do not replace `{{ .ConfirmationURL }}` with a manually copied URL.
- Keep email-provider link tracking disabled for authentication emails because
  link rewriting can interfere with Supabase verification links.
- Invitation metadata is used only for presentation. Organization membership,
  property membership, role and venue access are created and checked on the
  server.
- The `/invite` page only activates profiles whose status is still `pending`.
