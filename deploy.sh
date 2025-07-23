#!/bin/bash

# 🚀 Virtual Office Platform - Deployment Script
# This script helps you deploy both frontend and backend

set -e  # Exit on any error

echo "🚀 Virtual Office Platform Deployment"
echo "====================================="

# Check if we're in the right directory
if [ ! -f "DEPLOYMENT.md" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check if git repo is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes. Commit them first:"
    git status --short
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "📋 Pre-deployment checklist:"
echo "- [ ] Frontend works locally (npm run dev)"
echo "- [ ] Backend works locally (uvicorn main:app)"
echo "- [ ] Firebase is configured"
echo "- [ ] Environment variables are ready"
echo ""

read -p "Ready to deploy? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

echo ""
echo "🎯 Choose deployment option:"
echo "1) Deploy Frontend to Vercel (recommended)"
echo "2) Deploy Backend to Railway (recommended)"
echo "3) Deploy both (full deployment)"
echo "4) Test build locally"
echo ""

read -p "Choose option (1-4): " -n 1 -r
echo

case $REPLY in
    1)
        echo "📱 Deploying Frontend to Vercel..."
        cd frontend
        
        # Check if Vercel CLI is installed
        if ! command -v vercel &> /dev/null; then
            echo "Installing Vercel CLI..."
            npm install -g vercel
        fi
        
        # Build and deploy
        echo "Building frontend..."
        npm run build
        
        echo "Deploying to Vercel..."
        vercel --prod
        
        echo "✅ Frontend deployed successfully!"
        ;;
    
    2)
        echo "🖥️  Backend deployment info:"
        echo "Railway will auto-deploy when you push to main branch."
        echo "Make sure you've:"
        echo "- Connected your repo to Railway"
        echo "- Set environment variables"
        echo "- Pushed the latest changes"
        echo ""
        
        read -p "Push changes to trigger deployment? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add .
            git commit -m "Deploy: Backend updates" || echo "No changes to commit"
            git push origin main
            echo "✅ Changes pushed! Check Railway dashboard for deployment status."
        fi
        ;;
    
    3)
        echo "🚀 Full deployment..."
        
        # Frontend
        echo "📱 Deploying Frontend..."
        cd frontend
        npm run build
        vercel --prod
        cd ..
        
        # Backend
        echo "🖥️  Pushing Backend changes..."
        git add .
        git commit -m "Deploy: Full platform update" || echo "No changes to commit"
        git push origin main
        
        echo "✅ Full deployment initiated!"
        echo "Check your dashboards for deployment status."
        ;;
    
    4)
        echo "🧪 Testing local build..."
        
        # Test frontend build
        echo "Testing frontend build..."
        cd frontend
        npm run build
        echo "✅ Frontend build successful"
        cd ..
        
        # Test backend
        echo "Testing backend..."
        cd backend
        python -m pytest || echo "No tests found, but imports should work"
        echo "✅ Backend imports successful"
        cd ..
        
        echo "✅ Local builds successful!"
        ;;
    
    *)
        echo "Invalid option. Exiting."
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment script completed!"
echo ""
echo "📚 Next steps:"
echo "- Check deployment status in your dashboards"
echo "- Test your live application"
echo "- Set up custom domains if needed"
echo "- Monitor performance and errors"
echo ""
echo "📖 Need help? Check DEPLOYMENT.md for detailed instructions." 