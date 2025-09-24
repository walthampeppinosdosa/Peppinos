# Railway Deployment Guide

This guide covers deploying the entire Peppino's Restaurant backend (API + Socket.IO) to Railway.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin Panel   │    │                 │    │                 │
│   (Firebase)    │    │   Railway       │    │   MongoDB       │
│                 │───▶│   Backend       │───▶│   Atlas         │
│                 │    │                 │    │                 │
│   User App      │    │ • REST APIs     │    │                 │
│   (Firebase)    │    │ • Socket.IO     │    │                 │
└─────────────────┘    │ • WebSockets    │    └─────────────────┘
                       └─────────────────┘
```

## 🚀 Railway Deployment Steps

### Step 1: Create Railway Account & Setup

1. **Create Account**:
   - Go to [Railway.app](https://railway.app)
   - Click "Start a New Project"
   - Sign up with GitHub account
   - Authorize Railway to access your repositories

2. **Connect Repository**:
   - Railway will show your GitHub repositories
   - Select your `Peppinos` repository
   - Grant necessary permissions

3. **Initial Setup**:
   - Railway will automatically scan your repository
   - It will detect the Node.js project in `/server` directory
   - Choose "Deploy Now" when prompted

### Step 2: Deploy Backend to Railway

1. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `Peppinos` repository
   - Railway will scan and detect Node.js

2. **Configure Service Settings**:
   - **Service Name**: `peppinos-backend`
   - **Root Directory**: `server` (important!)
   - **Build Command**: `npm install` (auto-detected)
   - **Start Command**: `npm start` (auto-detected)
   - **Port**: Railway auto-assigns (usually 3000-8000)

3. **Advanced Settings** (if needed):
   - **Node.js Version**: 18.x or higher
   - **Build Phase**: Install dependencies
   - **Deploy Phase**: Start the server

4. **Environment Variables Setup**:

   **Important**: Add these in Railway Dashboard > Variables tab:

   **How to add variables**:
   - Go to your Railway project dashboard
   - Click on your service
   - Navigate to "Variables" tab
   - Click "New Variable" for each one below:

```env
# Database
MONGODB_URI=your_mongodb_atlas_connection_string

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=your_email@gmail.com

# Admin Configuration
ADMIN_EMAIL=walthampeppinosdosa@gmail.com

# Cloudinary (Image Upload)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Kinde Auth (if using)
KINDE_DOMAIN=your_kinde_domain
KINDE_CLIENT_ID=your_kinde_client_id
KINDE_CLIENT_SECRET=your_kinde_client_secret
KINDE_REDIRECT_URL=your_redirect_url
KINDE_LOGOUT_REDIRECT_URL=your_logout_url

# Environment
NODE_ENV=production
PORT=5000
```

### Step 3: Get Railway URL & Test Deployment

1. **Find Your URL**:
   - After deployment, go to Railway Dashboard
   - Click on your service
   - Look for "Domains" section
   - Copy the generated URL (e.g., `https://peppinos-backend-production-a1b2.up.railway.app`)

2. **Test the Deployment**:
   ```bash
   # Test health endpoint
   curl https://your-railway-url.up.railway.app/health

   # Expected response:
   {
     "success": true,
     "message": "Server is running",
     "timestamp": "2024-01-01T00:00:00.000Z"
   }
   ```

3. **Test Socket.IO Connection**:
   - Visit: `https://admin.socket.io`
   - Server URL: `https://your-railway-url.up.railway.app`
   - Should connect successfully

### Step 4: Update Frontend Configuration

Update `admin/.env`:
```env
# Replace with your Railway URL
VITE_API_URL=https://your-app-name-production.up.railway.app
VITE_APP_NAME=Peppinos Restaurant Admin
VITE_APP_VERSION=1.0.0
NODE_ENV=production
```

Update `peppinos/js/config.js`:
```javascript
const config = {
  // Replace with your Railway URL
  API_URL: 'https://your-app-name-production.up.railway.app',
  APP_NAME: 'Peppinos Restaurant',
  // ... other config
};
```

## 🔧 Railway Configuration Files

### package.json (already configured)
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### Railway Auto-Detection
Railway automatically detects:
- Node.js project
- Package.json dependencies
- Start command from package.json

## 🗄️ Database Setup (MongoDB Atlas)

1. **Create MongoDB Atlas Account**: [mongodb.com/atlas](https://mongodb.com/atlas)
2. **Create Cluster**: Choose free tier
3. **Create Database User**: 
   - Username: `peppinos-user`
   - Password: Generate strong password
4. **Network Access**: Add `0.0.0.0/0` (allow all IPs)
5. **Get Connection String**: 
   ```
   mongodb+srv://username:password@cluster.mongodb.net/peppinos?retryWrites=true&w=majority
   ```
6. **Add to Railway**: Set as `MONGODB_URI` environment variable

## 🌐 Frontend Deployment (Firebase)

### Admin Panel
```bash
cd admin
npm run build
firebase deploy --project peppinos-admin
```

### User App
```bash
cd peppinos
firebase deploy --project walthampeppinos
```

## ✅ Testing Socket.IO on Railway

1. **Check Health**: Visit `https://your-railway-url/health`
2. **Test Socket.IO**: 
   - Admin panel should show "Connected" status
   - Real-time order notifications should work
   - WebSocket connection should be stable

## 🔍 Monitoring & Logs

### Railway Dashboard
- **Logs**: Real-time application logs
- **Metrics**: CPU, Memory, Network usage
- **Deployments**: Deployment history and status

### Health Check Endpoint
```
GET https://your-railway-url/health
```
Response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "socketConnections": 0
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check Node.js version in `package.json`
   - Verify all dependencies are listed
   - Check Railway build logs

2. **Environment Variables**:
   - Ensure all required variables are set
   - Check variable names (case-sensitive)
   - Restart service after adding variables

3. **Database Connection**:
   - Verify MongoDB URI format
   - Check Atlas network access (0.0.0.0/0)
   - Ensure database user has correct permissions

4. **Socket.IO Issues**:
   - Check CORS configuration
   - Verify WebSocket support (Railway supports it)
   - Test with Socket.IO admin panel

## 💰 Railway Pricing

- **Hobby Plan**: $5/month per service
- **Pro Plan**: $20/month per service
- **Free Trial**: Available for testing

## 🔒 Security Checklist

- [ ] Strong JWT secret (32+ characters)
- [ ] MongoDB Atlas network restrictions
- [ ] Environment variables secured
- [ ] CORS properly configured
- [ ] HTTPS enforced (automatic on Railway)
- [ ] Input validation implemented
- [ ] Rate limiting configured

## 📱 Production URLs

After deployment:
- **Admin Panel**: https://peppinos-admin.web.app
- **User App**: https://walthampeppinos.web.app  
- **API + Socket.IO**: https://your-app-name-production.up.railway.app

## 🎯 Benefits of Railway

✅ **WebSocket Support**: Full Socket.IO compatibility
✅ **Auto-scaling**: Handles traffic spikes
✅ **Zero Config**: Automatic deployments
✅ **Persistent Storage**: Unlike serverless
✅ **Real-time Logs**: Easy debugging
✅ **Custom Domains**: Professional URLs
✅ **SSL Certificates**: Automatic HTTPS

Visit: https://walthampeppinos.web.app
