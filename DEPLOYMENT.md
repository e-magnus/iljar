# Deployment Guide

This guide covers deploying iljar to a production environment.

## Prerequisites

- Node.js 18+ server
- PostgreSQL 14+ database
- S3-compatible storage (AWS S3, MinIO, DigitalOcean Spaces, etc.)
- Domain name with SSL certificate

## Step 1: Server Setup

### Install Dependencies

```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm postgresql nginx certbot python3-certbot-nginx

# Install PM2 for process management
sudo npm install -g pm2
```

## Step 2: Database Setup

### Create Production Database

```bash
sudo -u postgres psql

CREATE DATABASE iljar_production;
CREATE USER iljar WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE iljar_production TO iljar;
\q
```

## Step 3: Application Setup

### Clone and Install

```bash
cd /var/www
git clone https://github.com/e-magnus/iljar.git
cd iljar
npm install
```

### Configure Environment

```bash
cp .env.example .env
nano .env
```

Update the following variables:

```env
# Database - Use production credentials
DATABASE_URL="postgresql://iljar:your-password@localhost:5432/iljar_production?schema=public"

# JWT Secrets - Generate strong random strings
JWT_SECRET="$(openssl rand -base64 32)"
JWT_REFRESH_SECRET="$(openssl rand -base64 32)"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# S3 Storage - Use your provider's credentials
S3_ENDPOINT="https://s3.amazonaws.com"
S3_BUCKET="iljar-photos-production"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
S3_REGION="us-east-1"

# Application
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

### Run Database Migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

### Build Application

```bash
npm run build
```

## Step 4: Initial Data

### Create First User

You can either:

1. Use the registration API:
```bash
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"your-secure-password"}'
```

2. Or seed the database (for testing):
```bash
npm run seed
```

## Step 5: Process Management

### Start with PM2

```bash
pm2 start npm --name "iljar" -- start
pm2 save
pm2 startup
```

### Verify Running

```bash
pm2 status
pm2 logs iljar
```

## Step 6: Nginx Reverse Proxy

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/iljar
```

Add the following:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/iljar /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Setup SSL with Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com
```

## Step 7: Automated Backups

### Configure Backup Script

```bash
sudo mkdir -p /var/backups/iljar
sudo chown iljar:iljar /var/backups/iljar
```

Create cron job:

```bash
sudo nano /etc/cron.daily/iljar-backup
```

Add:

```bash
#!/bin/bash
export DB_NAME="iljar_production"
export DB_USER="iljar"
export DB_PASSWORD="your-password"
export DB_HOST="localhost"
export DB_PORT="5432"
export BACKUP_DIR="/var/backups/iljar"
export RETENTION_DAYS="30"

/var/www/iljar/scripts/backup.sh
```

Make executable:

```bash
sudo chmod +x /etc/cron.daily/iljar-backup
```

Test:

```bash
sudo /etc/cron.daily/iljar-backup
```

## Step 8: Monitoring

### Setup PM2 Monitoring

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Monitor Logs

```bash
# Real-time logs
pm2 logs iljar

# Application logs
tail -f ~/.pm2/logs/iljar-out.log
tail -f ~/.pm2/logs/iljar-error.log
```

## Step 9: S3 Bucket Configuration

### AWS S3 Setup

1. Create bucket in AWS Console
2. Enable versioning
3. Block all public access
4. Set up lifecycle rules for old backups
5. Configure CORS for photo uploads:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT"],
        "AllowedOrigins": ["https://yourdomain.com"],
        "ExposeHeaders": []
    }
]
```

6. Create IAM user with S3 permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::iljar-photos-production/*"
        }
    ]
}
```

## Step 10: Security Checklist

- [ ] Strong database password
- [ ] Unique JWT secrets
- [ ] SSL certificate installed
- [ ] Firewall configured (ufw)
- [ ] S3 bucket is private
- [ ] Regular backups verified
- [ ] Logs are being rotated
- [ ] 2FA enabled for admin user
- [ ] Environment variables secured
- [ ] Database access restricted

## Maintenance

### Update Application

```bash
cd /var/www/iljar
git pull
npm install
npm run build
pm2 restart iljar
```

### Database Migrations

```bash
npx prisma migrate deploy
pm2 restart iljar
```

### View Logs

```bash
pm2 logs iljar --lines 100
```

### Restart Application

```bash
pm2 restart iljar
```

## Troubleshooting

### Application Won't Start

```bash
pm2 logs iljar --err
# Check for database connection issues
# Verify .env file is correct
```

### Database Connection Failed

```bash
# Test connection
psql postgresql://iljar:password@localhost:5432/iljar_production

# Check PostgreSQL is running
sudo systemctl status postgresql
```

### S3 Upload Failing

```bash
# Verify credentials
aws s3 ls s3://iljar-photos-production --profile iljar

# Check CORS configuration
# Verify bucket permissions
```

## Support

For production issues:
1. Check PM2 logs: `pm2 logs iljar`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check database logs: `sudo tail -f /var/log/postgresql/postgresql-14-main.log`
