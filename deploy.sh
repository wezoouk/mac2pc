#!/bin/bash

# Mac2PC File Transfer - Quick Deployment Script
# This script helps you deploy your application to various platforms

echo "🚀 Mac2PC File Transfer - Deployment Helper"
echo "============================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from your project root directory."
    exit 1
fi

echo "✅ Project directory confirmed"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the application
echo "🏗️ Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

echo ""
echo "🎉 Your application is ready for deployment!"
echo ""
echo "📋 Next steps:"
echo "1. Set up a PostgreSQL database (Neon, Supabase, or any provider)"
echo "2. Set the DATABASE_URL environment variable"
echo "3. Run 'npm run db:push' to set up database tables"
echo "4. Deploy using one of these options:"
echo ""
echo "   🌐 Vercel (Recommended):"
echo "   - Push to GitHub"
echo "   - Connect to Vercel"
echo "   - Set DATABASE_URL in environment variables"
echo ""
echo "   🚂 Railway:"
echo "   - Connect GitHub repo to Railway"
echo "   - Add PostgreSQL service"
echo "   - Deploy automatically"
echo ""
echo "   🔶 Heroku:"
echo "   - heroku create your-app-name"
echo "   - heroku addons:create heroku-postgresql:mini"
echo "   - git push heroku main"
echo ""
echo "   🖥️ Self-hosted:"
echo "   - Copy 'dist' folder to your server"
echo "   - Set up PostgreSQL"
echo "   - Run 'node dist/index.js'"
echo ""
echo "📚 For detailed instructions, see DEPLOYMENT_GUIDE.md"

# Create a simple .env template
if [ ! -f ".env.example" ]; then
    echo "📝 Creating .env.example template..."
    cat > .env.example << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# Application Configuration
NODE_ENV=production
PORT=5000

# Optional: If using custom domain
# CORS_ORIGIN=https://yourdomain.com
EOF
    echo "✅ Created .env.example - copy this to .env and fill in your values"
fi

echo ""
echo "🔍 Your built files are in the 'dist' directory"
echo "🗂️ Your complete project is ready for deployment"