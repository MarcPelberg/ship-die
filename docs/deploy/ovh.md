# OVH Deployment

This guide deploys Ship != Die to an OVH VPS with Docker Compose, Postgres, Caddy TLS, the web app, worker, and WhatsApp reader.

## Current production host

[aishipdie.com](https://aishipdie.com/) runs under `/opt/ship-die` on the shared OVH host at `135.148.171.224`. nginx terminates TLS and proxies to the app on `127.0.0.1:3187`. Certbot renews the certificates. Set `APP_PUBLISH=127.0.0.1:3187` and `PUBLIC_BASE_URL=https://aishipdie.com` in the server's private `.env`.

Route 53 serves the `aishipdie.com` hosted zone. Its apex A record points to `135.148.171.224` and its `www` CNAME points to `aishipdie.com.`. The previous `shipdie.marcpelberg.com` A record points to the same IP in the `marcpelberg.com` hosted zone. nginx redirects both aliases to `https://aishipdie.com` and preserves the original path and query string so shared archive links continue to work.

Update the running archive from GitHub:

```sh
cd /opt/ship-die
git pull --ff-only origin master
docker compose build app
docker compose up -d postgres
docker compose run --rm --no-deps app node dist/scripts/migrate.js
docker compose up -d --no-deps app
docker compose exec -T app node dist/scripts/smoke.js
curl -fsS 'https://aishipdie.com/?q=worktrees'
curl -sSI 'https://www.aishipdie.com/?q=worktrees'
curl -sSI 'https://shipdie.marcpelberg.com/?q=worktrees'
```

The production worker summarizes eligible messages with a private model on OVH. Set `LOCAL_CURATOR_MODEL=qwen3:4b-instruct-2507-q4_K_M` in the server's private `.env`. Install the model once and rebuild the worker when updating application code.

```sh
docker compose up -d curator
docker compose exec -T curator ollama pull qwen3:4b-instruct-2507-q4_K_M
docker compose up -d --build worker
```

The worker checks for new messages every minute. An interrupted or failed item stays pending. Link the dedicated WhatsApp reader as described below. Only confirmed public GitHub repository URLs are attached automatically by the local curator. The Caddy instructions below apply to a standalone VPS.

## Server

Provision an OVH VPS with Ubuntu LTS, point the production DNS record at the server public IP, and open ports 22, 80, and 443 in the OVH firewall.

Install Docker and the Compose plugin:

```sh
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc >/dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Log out and back in so the Docker group membership applies.

## Required Secrets

Create `/opt/ship-die/.env` with production values:

```sh
POSTGRES_USER=shipdie
POSTGRES_PASSWORD=<strong-postgres-password>
POSTGRES_DB=shipdie
DATABASE_URL=postgres://shipdie:<same-strong-postgres-password>@postgres:5432/shipdie
PORT=3000
PUBLIC_BASE_URL=https://example.com
ADMIN_TOKEN=<long-random-admin-token>
DEEPSEEK_API_KEY=<deepseek-api-key>
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_STRONG_MODEL=deepseek-v4-pro
WHATSAPP_GROUP_JID=<mexican-whatsapp-group-jid>
WHATSAPP_AUTH_DIR=.data/wa-auth
SITE_DOMAIN=example.com
```

`POSTGRES_PASSWORD` and the password inside `DATABASE_URL` must match. Keep private secrets as placeholders until entering real production values on the server. Do not commit `.env`.

## First Deploy

```sh
sudo mkdir -p /opt/ship-die
sudo chown "$USER:$USER" /opt/ship-die
cd /opt/ship-die
git clone https://github.com/MarcPelberg/ship-die.git .
cp .env.example .env
vi .env
docker compose build
docker compose up -d postgres
docker compose run --rm app node dist/scripts/migrate.js
docker compose up -d
```

Check service status:

```sh
docker compose ps
docker compose logs -f app worker reader caddy
```

## WhatsApp QR Scan

Use a dedicated Mexican WhatsApp account for production ingestion. Start the reader logs and scan the QR code from that phone:

```sh
docker compose logs -f reader
```

After the QR scan succeeds, the auth state is stored in the `whatsapp-auth` Docker volume at `/app/.data/wa-auth`. Do not reuse a personal WhatsApp account for this service.

If you need the group ID, leave `WHATSAPP_GROUP_JID` empty while pairing. The reader pauses ingestion and, on connection, prints the JID only if exactly one group matches either the current title `/Ship!=Die` or the historical title `/ship! = die development`. Set that JID in `.env` and run `docker compose up -d reader` to enable ingestion. A worker with neither a local model nor a DeepSeek API key leaves messages pending.

## Smoke Check

Run the production smoke check after deploy:

```sh
docker compose run --rm app node dist/scripts/smoke.js
```

You can also check the endpoint directly:

```sh
curl -fsS https://example.com/healthz
```

## Backups

Create a compressed Postgres backup from the server:

```sh
mkdir -p backups
docker compose exec -T postgres pg_dump -U shipdie -d shipdie | gzip > "backups/shipdie-$(date +%Y%m%d-%H%M%S).sql.gz"
```

Copy backups off the OVH server regularly and verify restore procedures before relying on them.

## Review private group requests

On the OVH server, use the following read-only query from a private terminal to review the latest 25 applications. The form stores one request per WhatsApp number. A repeat submission preserves the original application. An organizer reviews requests and handles invitations separately.

```sh
cd /opt/ship-die
docker compose exec postgres psql -X -U shipdie -d shipdie -P pager=off \
  -c 'select id, submitted_at, name, whatsapp_phone, background from group_join_requests order by submitted_at desc, id desc limit 25'
```
