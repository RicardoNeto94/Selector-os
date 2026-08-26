-- Integration credentials remain encrypted in Supabase Vault. Application
-- clients never receive this function and never read decrypted secrets.

create extension if not exists supabase_vault with schema vault;

create or replace function public.get_integration_connection_credentials(
  p_connection_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  secret_payload text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required';
  end if;

  select decrypted_secrets.decrypted_secret
  into secret_payload
  from public.integration_connections
  join vault.decrypted_secrets
    on decrypted_secrets.id::text = integration_connections.credentials_secret_ref
  where integration_connections.id = p_connection_id
    and integration_connections.status = 'active';

  if secret_payload is null then
    return null;
  end if;

  return secret_payload::jsonb;
end;
$$;

revoke all on function public.get_integration_connection_credentials(uuid) from public;
grant execute on function public.get_integration_connection_credentials(uuid) to service_role;

comment on function public.get_integration_connection_credentials(uuid) is
  'Server-only access to an active integration connection credential stored as JSON in Supabase Vault.';
