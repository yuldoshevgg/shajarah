#!/bin/bash
set -e

DOMAIN="my-shajara.uz"
EMAIL="your@email.com"   # <-- change this

echo "==> Starting app services..."
docker compose up -d db backend frontend

echo "==> Creating dummy self-signed cert so nginx can start..."
docker compose run --rm --entrypoint "" certbot sh -c "
  mkdir -p /etc/letsencrypt/live/$DOMAIN
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out    /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj '/CN=localhost'
"

echo "==> Starting nginx with dummy cert..."
docker compose up -d nginx

echo "==> Waiting for nginx to be ready..."
sleep 3

echo "==> Issuing real Let's Encrypt certificate..."
docker compose run --rm --entrypoint "" certbot certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

echo "==> Reloading nginx with real cert..."
docker compose exec nginx nginx -s reload

echo "==> Starting certbot auto-renewal service..."
docker compose up -d certbot

echo ""
echo "Done! Visit https://$DOMAIN"
