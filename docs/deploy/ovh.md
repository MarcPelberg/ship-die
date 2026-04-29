# OVH Deployment

This guide deploys Ship != Die to an OVH VPS with Docker Compose, Postgres, Caddy TLS, the web app, worker, and WhatsApp reader.

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
DATABASE_URL=postgres://shipdie:shipdie@postgres:5432/shipdie
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

Keep private secrets as placeholders until entering real production values on the server. Do not commit `.env`.

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
