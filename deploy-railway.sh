#!/bin/bash

# Railway Deployment Script for SDR Console

set -e

echo "🚂 SDR Console Railway Deployment"
echo "=================================="
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Step 1: Deploy Backend
echo "📦 Step 1: Deploying Backend..."
echo "================================"
echo ""

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Logging into Railway..."
    railway login
fi

echo "✅ Logged into Railway"
echo ""

# Link project if not already linked
if [ ! -f ".railway/project.json" ]; then
    echo "🔗 Linking to Railway project..."
    railway link
fi

echo "📤 Deploying backend..."
railway up

echo ""
echo "✅ Backend deployed!"
echo ""
echo "🔗 Your backend URL will be shown above (something like https://xxx.railway.app)"
echo ""
read -p "📝 Enter your backend URL: " BACKEND_URL

# Step 2: Deploy Frontend
echo ""
echo "📦 Step 2: Deploying Frontend..."
echo "================================"
echo ""

cd frontend

# Link frontend as a separate service
if [ ! -f ".railway/service.json" ]; then
    echo "🔗 Creating frontend service..."
    railway service
fi

# Set frontend environment variable
echo "⚙️  Setting NEXT_PUBLIC_API_URL=$BACKEND_URL"
railway variables set NEXT_PUBLIC_API_URL="$BACKEND_URL"

echo "📤 Deploying frontend..."
railway up

echo ""
echo "✅ Frontend deployed!"
echo ""
echo "🔗 Your frontend URL will be shown above (something like https://xxx.railway.app)"
echo ""
read -p "📝 Enter your frontend URL: " FRONTEND_URL

# Step 3: Update backend with frontend URL
cd ..
echo ""
echo "📦 Step 3: Updating Backend Configuration..."
echo "============================================"
echo ""

echo "⚙️  Setting FRONTEND_URL=$FRONTEND_URL"
railway variables set FRONTEND_URL="$FRONTEND_URL"

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "📍 Backend:  $BACKEND_URL"
echo "📍 Frontend: $FRONTEND_URL"
echo ""
echo "🔐 Remember to set these environment variables in Railway dashboard:"
echo "   - ANTHROPIC_API_KEY"
echo "   - APOLLO_API_KEY"
echo "   - RELAYER_API_KEY"
echo ""
echo "📖 See RAILWAY_DEPLOY.md for detailed instructions"
echo ""
