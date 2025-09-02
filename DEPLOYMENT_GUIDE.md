# Mac2PC File Transfer - Deployment Guide

This guide shows you how to download your project from Replit and deploy it to other platforms.

## 📥 Downloading Your Project from Replit

### Method 1: Export as ZIP (Recommended)
1. In your Replit workspace, click the three dots menu (⋮) 
2. Select "Download as zip"
3. Your entire project will be downloaded as a zip file

### Method 2: Git Clone
```bash
git clone https://github.com/your-username/your-repo-name.git
```

## 🏗️ Project Structure

Your application consists of:
- **Frontend**: React + TypeScript + Vite (in `/client` folder)
- **Backend**: Express.js + WebSocket server (in `/server` folder)
- **Database**: PostgreSQL with Drizzle ORM
- **Build System**: Vite for frontend, esbuild for backend

## 🚀 Deployment Options

### Option 1: Vercel (Recommended for Ease)

**Prerequisites**: 
- Vercel account
- PostgreSQL database (Neon, Supabase, or AWS RDS)

**Steps**:
1. Push your code to GitHub
2. Connect Vercel to your GitHub repo
3. Set environment variables in Vercel:
   ```
   DATABASE_URL=your_postgresql_connection_string
   NODE_ENV=production
   ```
4. Vercel will automatically detect and deploy both frontend and backend

### Option 2: Railway

**Steps**:
1. Create Railway account
2. Connect your GitHub repo
3. Railway auto-detects Node.js and deploys
4. Add PostgreSQL service from Railway's marketplace
5. Set environment variables

### Option 3: Heroku

**Steps**:
1. Install Heroku CLI
2. Create new Heroku app:
   ```bash
   heroku create your-app-name
   ```
3. Add PostgreSQL addon:
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```
4. Deploy:
   ```bash
   git push heroku main
   ```

### Option 4: DigitalOcean App Platform

**Steps**:
1. Create DigitalOcean account
2. Use App Platform to deploy from GitHub
3. Add managed PostgreSQL database
4. Configure environment variables

### Option 5: Self-Hosted VPS (Ubuntu/Debian)

**Requirements**:
- VPS with Ubuntu 20.04+
- Domain name (optional)

**Setup Script**:
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Clone your project
git clone your-repo-url
cd your-project

# Install dependencies
npm install

# Build the application
npm run build

# Set up PostgreSQL database
sudo -u postgres createdb mac2pc
sudo -u postgres createuser --interactive

# Set environment variables
export DATABASE_URL="postgresql://username:password@localhost:5432/mac2pc"
export NODE_ENV=production

# Run database migrations
npm run db:push

# Start the application
npm start
```

**Process Manager (PM2)**:
```bash
# Install PM2
npm install -g pm2

# Start your app with PM2
pm2 start dist/index.js --name "mac2pc"

# Set up auto-start on boot
pm2 startup
pm2 save
```

**Nginx Reverse Proxy**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🗄️ Database Setup

### Required Environment Variables:
```bash
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=production
```

### Database Providers:
- **Neon** (PostgreSQL): Free tier available
- **Supabase**: Free tier with 500MB
- **AWS RDS**: Pay-as-you-go
- **DigitalOcean Managed Database**: Starting at $15/month

## 🔧 Configuration Changes for Production

### 1. Update `package.json` scripts (already configured):
```json
{
  "scripts": {
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js"
  }
}
```

### 2. Environment Variables:
Create `.env` file:
```
DATABASE_URL=your_database_url
NODE_ENV=production
PORT=5000
```

### 3. CORS Configuration:
Your app is already configured to work across domains with proper CORS settings.

## 🔒 Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **Environment Variables**: Never commit sensitive data to Git
3. **Database Security**: Use connection pooling and proper authentication
4. **Rate Limiting**: Consider adding rate limiting for API endpoints

## 📊 Monitoring

Consider adding:
- **Uptime monitoring**: UptimeRobot, Pingdom
- **Error tracking**: Sentry
- **Analytics**: Custom analytics or Google Analytics
- **Logs**: Structured logging with Winston

## 💰 Cost Estimation

### Free Tiers Available:
- **Vercel**: Free tier with generous limits
- **Railway**: $5/month after trial
- **Heroku**: Free tier discontinued, starts at $7/month
- **Neon DB**: Free PostgreSQL tier

### Self-Hosted:
- **VPS**: $5-20/month (DigitalOcean, Linode, Vultr)
- **Domain**: $10-15/year

## 🚨 Important Notes

1. **WebSocket Support**: Ensure your hosting provider supports WebSocket connections
2. **File Upload Limits**: Configure appropriate file size limits
3. **Database Connections**: Use connection pooling for better performance
4. **Backup Strategy**: Set up regular database backups

## 📞 Support

If you need help with deployment:
1. Check the hosting provider's documentation
2. Most providers have excellent deployment guides for Node.js apps
3. Consider using deployment services like Railway or Vercel for simplicity

Your application is production-ready and will work on any platform that supports Node.js and PostgreSQL!