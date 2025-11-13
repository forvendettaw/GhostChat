# Custom PeerJS Server Configuration

GhostChat allows you to use your own PeerJS signaling server for true decentralization.

## Why Use a Custom Server?

- **Full control**: Own your infrastructure
- **Privacy**: No third-party dependencies
- **Reliability**: Not dependent on free tier limits
- **Decentralization**: True peer-to-peer without central authority

## Default Setup

By default, GhostChat uses the free PeerJS cloud server (0.peerjs.com):
- No configuration needed
- Free for reasonable usage
- Good for testing and small-scale use

## Using Your Own Server

### Option 1: Configure in the UI

1. Open GhostChat
2. Click "Settings" button (top right)
3. Enter your server details:
   - **Host**: Your server domain (e.g., `peer.example.com`)
   - **Port**: Server port (default: `443`)
   - **Path**: Server path (default: `/`)
   - **API Key**: Your API key (default: `peerjs`)
4. Click "Save"
5. Reload the page

### Option 2: Set via Browser Console

```javascript
// Set custom server
localStorage.setItem('peerjs_host', 'peer.example.com');
localStorage.setItem('peerjs_port', '443');
localStorage.setItem('peerjs_path', '/');
localStorage.setItem('peerjs_key', 'your-api-key');

// Reload page
location.reload();
```

### Option 3: Clear Custom Config (Use Default)

```javascript
// Clear custom config
localStorage.removeItem('peerjs_host');
localStorage.removeItem('peerjs_port');
localStorage.removeItem('peerjs_path');
localStorage.removeItem('peerjs_key');

// Reload page
location.reload();
```

## Self-Hosting PeerJS Server

### Quick Start with Docker

```bash
# Run PeerJS server
docker run -d \
  -p 9000:9000 \
  peerjs/peerjs-server \
  --port 9000 \
  --key peerjs \
  --path /

# Configure GhostChat to use it
# Host: your-server-ip
# Port: 9000
# Path: /
# Key: peerjs
```

### Deploy on Cloud

**Heroku:**
```bash
git clone https://github.com/peers/peerjs-server.git
cd peerjs-server
heroku create your-peer-server
git push heroku master
```

**DigitalOcean/AWS/VPS:**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PeerJS server
npm install -g peer

# Run server
peerjs --port 9000 --key peerjs --path /
```

**With SSL (Recommended):**
```bash
# Install Nginx + Certbot
sudo apt install nginx certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d peer.example.com

# Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/peerjs

# Add:
server {
    listen 443 ssl;
    server_name peer.example.com;
    
    ssl_certificate /etc/letsencrypt/live/peer.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/peer.example.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

# Enable and restart
sudo ln -s /etc/nginx/sites-available/peerjs /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

## Community Servers

Users can share their PeerJS servers with the community:

**Example Community Servers:**
- `peer1.ghostchat.community` (Port: 443, Key: ghostchat)
- `peer2.ghostchat.community` (Port: 443, Key: ghostchat)

*Note: These are examples. Community servers should be verified and trusted.*

## Security Considerations

- Use HTTPS/SSL for production servers
- Change default API key
- Implement rate limiting
- Monitor server usage
- Keep server software updated

## Cost Estimates

**Self-Hosting Costs:**
- DigitalOcean Droplet: $5-10/month
- AWS EC2 t2.micro: ~$8/month
- Heroku Hobby: $7/month
- VPS providers: $3-10/month

**Free Tier (Default):**
- PeerJS Cloud: Free for reasonable usage
- No credit card required
- Good for personal use

## Troubleshooting

**Connection fails with custom server:**
- Check server is running: `curl https://your-server/peerjs/id`
- Verify SSL certificate is valid
- Check firewall allows port 443
- Ensure WebSocket support is enabled

**Settings not applying:**
- Reload the page after saving
- Check browser console for errors
- Clear browser cache if needed

## Technical Details

**What the signaling server does:**
- Helps peers discover each other
- Exchanges WebRTC connection info (SDP/ICE)
- Does NOT relay messages (true P2P)

**What it does NOT do:**
- Store messages
- Read message content
- Track conversations
- Log user data

## Contributing

Share your PeerJS server with the community:
1. Deploy a public PeerJS server
2. Submit PR to add it to community list
3. Help others achieve true decentralization!

---

**Questions?** Open an issue on GitHub.
