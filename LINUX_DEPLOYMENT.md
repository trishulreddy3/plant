# Linux Server (VPS) Deployment Guide

This guide describes how to deploy the Solar Plant Monitoring system on a standard Linux server (Ubuntu/Debian) using Nginx, PM2, and Node.js.

## 🏗️ Architecture Overview
- **Storage**: PostgreSQL (SQL)
- **Backend**: Node.js / Express
- **Frontend**: Vite / React (Served as static files by the Backend)
- **Process Manager**: PM2
- **Reverse Proxy**: Nginx

## 📋 Prerequisites
1. A Linux server (VPS) with SSH access.
2. Node.js (v20+) installed.
3. PostgreSQL installed and running.
4. Nginx installed.
5. PM2 installed (`npm install -g pm2`).

## 🚀 Setup Steps

### 1. Database Setup
Create a PostgreSQL database and user:
```sql
CREATE DATABASE solar_plant;
CREATE USER solar_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE solar_plant TO solar_user;
```

### 2. Prepare Code
Clone your repository to the server:
```bash
git clone <your-repo-url> /var/www/solar-plant
cd /var/www/solar-plant
```

### 3. Install Dependencies & Build
```bash
# Install root dependencies (Frontend)
npm install
npm run build

# Install backend dependencies
cd backend
npm install
```

### 4. Configure Environment
Create a `.env` file in the `backend` directory:
```bash
nano .env
```
Add the following details (Update with your server's credentials):
```env
DB_NAME=solar_plant
DB_USER=solar_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
PORT=5000
JWT_SECRET=your_long_random_secret_here
NODE_ENV=production
```

### 5. Start Backend with PM2
```bash
# From the backend directory
pm2 start server.js --name solar-plant
pm2 save
pm2 startup
```

### 6. Configure Nginx
Create a new Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/solar-plant
```
Add the following configuration (using port 3399 as requested):
```nginx
server {
    listen 3399;
    server_name 49.207.12.183;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Optional: Increase upload limit for larger logs/data if needed
    client_max_body_size 10M;
}
```
Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/solar-plant /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🛠️ Maintenance & Logs
- **View Logs**: `pm2 logs solar-plant`
- **Restart App**: `pm2 restart solar-plant`
- **Stop App**: `pm2 stop solar-plant`

## 🔒 Security Recommendations
1. **SSL/TLS**: Use Certbot (Let's Encrypt) to enable HTTPS:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your_domain
   ```
2. **Firewall**: Ensure only required ports and 22 (SSH) are open:
   ```bash
   sudo ufw allow 3399
   sudo ufw allow 'Nginx Full'
   ```
3. **Environment**: Keep your `JWT_SECRET` and DB passwords out of version control.
