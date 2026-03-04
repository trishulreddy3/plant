#!/bin/bash

# Cloudflare Tunnel Setup Script for Solar Plant App
# Based on the guide provided by the user.

TUNNEL_NAME="solar-plant"
HOSTNAME="solar.oniisama.cloud"
CONFIG_DIR="$HOME/.cloudflared"
CONFIG_FILE="$CONFIG_DIR/config.yml"

echo "🚀 Starting Cloudflare Tunnel Setup..."

# 1. Install cloudflared if not installed
if ! command -v cloudflared &> /dev/null; then
    echo "📦 Installing cloudflared..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Check if it's Ubuntu/Debian
        if [ -f /etc/debian_version ]; then
            curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
            sudo dpkg -i cloudflared.deb
            rm cloudflared.deb
        else
            echo "❌ Non-Debian Linux detected. Please install cloudflared manually: https://pkg.cloudflare.com/index.html"
            exit 1
        fi
    else
        echo "❌ Non-Linux OS detected. Please install cloudflared manually: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-and-setup/tunnel-guide/local/install/"
        exit 1
    fi
else
    echo "✅ cloudflared is already installed."
fi

# 2. Login
if [ ! -f "$CONFIG_DIR/cert.pem" ]; then
    echo "🔑 Please authorize cloudflared in your browser..."
    cloudflared tunnel login
else
    echo "✅ Already logged in to Cloudflare."
fi

# 3. Create Tunnel if it doesn't exist
EXISTING_TUNNEL=$(cloudflared tunnel list | grep "$TUNNEL_NAME")
if [ -z "$EXISTING_TUNNEL" ]; then
    echo "🏗️ Creating tunnel: $TUNNEL_NAME..."
    TUNNEL_INFO=$(cloudflared tunnel create "$TUNNEL_NAME")
    TUNNEL_ID=$(echo "$TUNNEL_INFO" | grep -oE "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" | head -n 1)
    echo "✅ Tunnel created with ID: $TUNNEL_ID"
else
    TUNNEL_ID=$(echo "$EXISTING_TUNNEL" | awk '{print $1}')
    echo "✅ Using existing tunnel: $TUNNEL_NAME (ID: $TUNNEL_ID)"
fi

# 4. Configure the Tunnel
echo "📝 Configuring tunnel..."
mkdir -p "$CONFIG_DIR"
cat <<EOF > "$CONFIG_FILE"
tunnel: $TUNNEL_ID
credentials-file: $CONFIG_DIR/$TUNNEL_ID.json

ingress:
  - hostname: $HOSTNAME
    service: http://localhost:8081
  - service: http_status:404
EOF

echo "✅ Config saved to $CONFIG_FILE"

# 5. Route DNS
echo "🌐 Routing DNS for $HOSTNAME..."
cloudflared tunnel route dns "$TUNNEL_NAME" "$HOSTNAME" || echo "⚠️ DNS routing might have failed if already exists or manual CNAME required."

echo "✨ setup-cloudflare.sh complete!"
echo "You can now run 'cloudflared tunnel run $TUNNEL_NAME' to start the tunnel."
