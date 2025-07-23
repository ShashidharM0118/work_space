# 🚀 Deployment Guide

This guide covers deploying your Enterprise Virtual Office platform to production.

## 📋 Prerequisites

1. **Firebase Project** - Already configured ✅
2. **Git Repository** - Push your code to GitHub/GitLab
3. **Domain Name** (optional but recommended)

## 🎯 Recommended Architecture

```
Frontend (Vercel) ↔ Backend (Railway/Render) ↔ Firebase
     ↓                      ↓                    ↓
  Static Site          WebSocket Server      Database
```

## 🌐 Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Update next.config.js** for production:
   ```javascript
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     async rewrites() {
       return [
         {
           source: '/ws/:path*',
           destination: process.env.NEXT_PUBLIC_BACKEND_WS_URL + '/ws/:path*',
         },
       ];
     },
     async headers() {
       return [
         {
           source: '/(.*)',
           headers: [
             {
               key: 'X-Frame-Options',
               value: 'DENY',
             },
             {
               key: 'X-Content-Type-Options',
               value: 'nosniff',
             },
           ],
         },
       ];
     },
   };
   module.exports = nextConfig;
   ```

### Step 2: Deploy to Vercel

**Option A: Vercel Website (Easiest)**
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project"
4. Import your repository
5. Select the `frontend` folder as root
6. Add environment variables:
   - `NEXT_PUBLIC_BACKEND_WS_URL`: `wss://your-backend-domain.com`
7. Deploy!

**Option B: Vercel CLI**
```bash
cd frontend
vercel --prod
```

### Step 3: Configure Custom Domain (Optional)
1. In Vercel dashboard → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

## 🖥️ Backend Deployment

### Option 1: Railway (Recommended - Easy & Reliable)

1. **Sign up**: Go to [railway.app](https://railway.app)
2. **Create New Project**: Connect your GitHub repo
3. **Select backend folder**: Choose `backend` as the service
4. **Environment Variables**: Add in Railway dashboard:
   ```
   PORT=8000
   FIREBASE_PROJECT_ID=typio-57fa9
   FIREBASE_PRIVATE_KEY=your_firebase_private_key
   FIREBASE_CLIENT_EMAIL=your_firebase_client_email
   ```
5. **Deploy**: Railway will automatically deploy using the Dockerfile

### Option 2: Render

1. **Sign up**: Go to [render.com](https://render.com)
2. **New Web Service**: Connect GitHub repo
3. **Settings**:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Python Version**: 3.11
4. **Environment Variables**: Same as Railway
5. **Deploy**

### Option 3: Google Cloud Run

1. **Build and push**:
   ```bash
   cd backend
   gcloud builds submit --tag gcr.io/your-project/virtual-office-backend
   ```

2. **Deploy**:
   ```bash
   gcloud run deploy virtual-office-backend \
     --image gcr.io/your-project/virtual-office-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

## 🔐 Environment Variables Setup

### Frontend (.env.local in Vercel)
```bash
NEXT_PUBLIC_BACKEND_WS_URL=wss://your-backend-domain.railway.app
```

### Backend (Railway/Render Dashboard)
```bash
PORT=8000
FIREBASE_PROJECT_ID=typio-57fa9
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@typio-57fa9.iam.gserviceaccount.com
```

## 🛡️ Security Configuration

### 1. Firebase Security Rules
Update `firestore.rules` for production:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Add your production-ready security rules
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // ... other rules
  }
}
```

### 2. CORS Configuration
Update backend `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-frontend-domain.vercel.app",
        "https://your-custom-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3. Firebase Authentication
- Add your production domains to Firebase Console
- Update authorized domains in Firebase Authentication settings

## 📊 Monitoring & Analytics

### 1. Vercel Analytics
- Enable in Vercel dashboard → Analytics

### 2. Backend Monitoring
- Railway: Built-in metrics
- Render: Integrated monitoring
- Add custom logging for WebSocket connections

### 3. Firebase Analytics
- Already configured with `measurementId`

## 🚀 Deployment Commands Summary

### Quick Deploy Script
```bash
#!/bin/bash
# Deploy script

echo "🚀 Deploying Virtual Office Platform..."

# Frontend to Vercel
echo "📱 Deploying frontend..."
cd frontend
vercel --prod

# Backend to Railway (automatic on git push)
echo "🖥️ Backend will auto-deploy on git push to Railway"

echo "✅ Deployment complete!"
echo "🌐 Frontend: https://your-app.vercel.app"
echo "🔌 Backend: https://your-backend.railway.app"
```

## 🔄 CI/CD Setup (Optional)

### GitHub Actions for Auto-Deploy
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./frontend
```

## 🎯 Post-Deployment Checklist

- [ ] ✅ Frontend loads without errors
- [ ] ✅ WebSocket connections work
- [ ] ✅ Firebase authentication works
- [ ] ✅ Video calls connect successfully
- [ ] ✅ Real-time features working
- [ ] ✅ Mobile responsiveness tested
- [ ] ✅ Custom domain configured
- [ ] ✅ SSL certificates active
- [ ] ✅ Analytics tracking
- [ ] ✅ Performance monitoring

## 🆘 Troubleshooting

### Common Issues:

1. **WebSocket Connection Failed**
   - Check CORS settings
   - Verify environment variables
   - Ensure WSS (not WS) for HTTPS sites

2. **Firebase Auth Issues**
   - Check authorized domains
   - Verify API keys
   - Check network tab for errors

3. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies installed
   - Check TypeScript errors

### Debug Commands:
```bash
# Test backend health
curl https://your-backend.railway.app/health

# Check WebSocket connection
wscat -c wss://your-backend.railway.app/ws/test-room

# Test frontend build locally
npm run build && npm start
```

## 💰 Cost Estimates

### Free Tier Options:
- **Vercel**: Free for personal use
- **Railway**: $5/month for starter plan
- **Render**: Free tier available
- **Firebase**: Generous free tier

### Total Monthly Cost: ~$5-20 for small teams

## 🔄 Updates & Maintenance

1. **Frontend**: Auto-deploys on git push to main
2. **Backend**: Auto-deploys on git push to main
3. **Database**: Firebase handles scaling
4. **Monitoring**: Set up alerts for downtime

---

## 🎉 You're Ready to Deploy!

Choose your preferred option and follow the steps above. The recommended combo is:
- **Frontend**: Vercel (excellent Next.js support)
- **Backend**: Railway (simple, reliable, great for Node.js/Python)
- **Database**: Firebase (already configured)

Need help? Check the troubleshooting section or create an issue in the repository. 