#!/usr/bin/env bash
# Run on the Compose host after migrating, using the owner of .env.join-notifier.
set +x
set -euo pipefail
cd "$(dirname "$0")/.."
config=.env.join-notifier
if [[ ! -f $config || -L $config || ! -O $config || $(stat -c %a "$config") != 600 ]]; then
  echo "A private, owner-readable .env.join-notifier with mode 0600 is required." >&2
  exit 1
fi
exec 9>>"$config"
flock -x 9
for name in AWS_REGION AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY JOIN_NOTIFY_FROM JOIN_NOTIFY_TO; do
  grep -qE "^${name}=.+" "$config" || { echo "Missing $name" >&2; exit 1; }
done

admin() {
  docker compose exec -T postgres sh -c 'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"' sh "$@"
}
db=$(admin -Atqc 'select current_database()' </dev/null)
[[ "$db" =~ ^[a-zA-Z0-9_-]+$ ]] || { echo 'Unexpected database name' >&2; exit 1; }
role=ship_join_notifier
exists=$(admin -Atqc "select exists(select from pg_roles where rolname='$role')" </dev/null)
prefix="postgresql://$role:"
suffix="@postgres:5432/$db"
if grep -q '^DATABASE_URL=' "$config"; then
  url=$(sed -n 's/^DATABASE_URL=//p' "$config")
  password=${url#"$prefix"}
  password=${password%"$suffix"}
  [[ "$url" == "$prefix$password$suffix" && "$password" =~ ^[0-9a-f]{48}$ ]] || { echo 'Unexpected notifier database URL' >&2; exit 1; }
else
  [[ "$exists" == f ]] || { echo 'A notifier role exists without its associated credential file' >&2; exit 1; }
  password=$(openssl rand -hex 24)
  printf '\nDATABASE_URL=%s%s%s\n' "$prefix" "$password" "$suffix" >&9
fi
if [[ "$exists" == f ]]; then
  admin -qc "create role $role login nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls" </dev/null
fi
restricted=$(admin -Atqc "select rolcanlogin and not (rolsuper or rolcreatedb or rolcreaterole or rolreplication or rolbypassrls) and not exists(select from pg_auth_members m where m.member=r.oid) from pg_roles r where rolname='$role'" </dev/null)
[[ "$restricted" == t ]] || { echo 'The notifier role has unexpected privileges' >&2; exit 1; }

# psql's password command sends an encrypted verifier. The password stays out of arguments and SQL logs.
printf '%s\n%s\n' "$password" "$password" | admin -c "\\password $role" >/dev/null
unset password url
admin -q <<SQL
grant connect on database "$db" to $role;
grant usage on schema public to $role;
grant select (id, name, whatsapp_phone, background, notification_due_at, notification_attempts),
      update (notification_due_at, notification_sent_at, notification_attempts)
  on table public.group_join_requests to $role;
SQL
echo 'Scoped notifier database access is ready.'
