# Peppinos Restaurant System - Complete Deployment Guide

## 📋 System Overview

The Peppinos restaurant system consists of three main components:
- **Frontend Website** (`peppinos/`) - Customer-facing website (Firebase Hosting)
- **Admin Panel** (`admin/`) - Restaurant management dashboard (Firebase Hosting)
- **Backend API** (`server/`) - Node.js/Express API server (Vercel)

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Admin Panel   │    │   Backend API   │
│   (Firebase)    │◄──►│   (Firebase)    │◄──►│   (Vercel)      │
│                 │    │                 │    │                 │
│ walthampeppinos │    │ peppinos-admin  │    │ peppinos-backend│
│ .web.app        │    │ .web.app        │    │ .vercel.app     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 Key Changes - No More Aliases!

This deployment guide has been **streamlined** to remove all Firebase aliases and use direct project deployment:
- ✅ **No aliases** - Direct project targeting
- ✅ **Simplified commands** - Clear, straightforward deployment
- ✅ **Clean configuration** - Minimal `.firebaserc` files
- ✅ **Better rewrites** - Proper client-side routing support

## 🔧 Prerequisites

### Required Tools
- Node.js (v18 or higher)
- npm or yarn
- Git
- Firebase CLI: `npm install -g firebase-tools`
- Vercel CLI: `npm install -g vercel`

### Required Accounts
- **Firebase** account with two projects:
  - `walthampeppinos` (for frontend website)
  - `peppinos-admin` (for admin panel)
- **Vercel** account (for backend API)
- **MongoDB Atlas** account (database)
- **Cloudinary** account (image storage)
- **Gmail** account (SMTP email service)

## 📁 Project Structure

```
peppinos-admin/
├── peppinos/                 # Frontend website
│   ├── assets/
│   │   ├── js/
│   │   │   └── config.js     # API configuration
│   │   └── css/
│   ├── index.html
│   └── ...
├── admin/                    # Admin panel (React/Vite)
│   ├── src/
│   ├── dist/                 # Build output
│   ├── .env                  # Environment variables
│   ├── firebase.json         # Firebase config
│   └── package.json
├── server/                   # Backend API (Node.js/Express)
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── .env                  # Environment variables
│   ├── vercel.json           # Vercel config
│   └── server.js
├── firebase.json             # Frontend Firebase config
└── .firebaserc              # Firebase projects config
```

## 🚀 Deployment Process

### 1. Backend Deployment (Vercel)

#### Step 1: Configure Environment Variables
Navigate to `server/` directory and ensure `.env` file contains:

```env
# Database
MONGODB_URI=mongodb+srv://your-connection-string

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com
ADMIN_EMAIL=admin@yourdomain.com

# URLs
CLIENT_URL=https://walthampeppinos.web.app
ADMIN_URL=https://peppinos-admin.web.app

# Server
PORT=5000
NODE_ENV=production
```

#### Step 2: Deploy to Vercel
```bash
cd server
npx vercel --prod
```

#### Step 3: Verify Deployment
Test the health endpoint:
```bash
curl https://peppinos-backend.vercel.app/api/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Peppino's Restaurant API is running",
  "timestamp": "2025-09-14T18:57:23.409Z"
}
```

### 2. Admin Panel Deployment (Firebase)

#### Step 1: Configure Environment Variables
Navigate to `admin/` directory and ensure `.env` file contains:

```env
# API Configuration
VITE_API_URL=https://peppinos-backend.vercel.app

# App Configuration
VITE_APP_NAME=Peppino's Restaurant Admin
VITE_APP_VERSION=1.0.0

# Environment
VITE_NODE_ENV=production
```

#### Step 2: Build the Application
```bash
cd admin
npm install
npm run build
```

#### Step 3: Deploy to Firebase
```bash
firebase deploy --only hosting
```

#### Step 4: Verify Deployment
Visit: https://peppinos-admin.web.app

### 3. Frontend Website Deployment (Firebase)

#### Step 1: Configure API Endpoint
Update `peppinos/assets/js/config.js`:

```javascript
export const CONFIG = {
  API: {
    BASE_URL: 'https://peppinos-backend.vercel.app',
    // ... rest of configuration
  }
};
```

#### Step 2: Deploy to Firebase
From the root directory:
```bash
firebase use production  # Switch to walthampeppinos project
firebase deploy --only hosting
```

#### Step 3: Verify Deployment
Visit: https://walthampeppinos.web.app

## 🔄 Update Deployment Process

### For Backend Updates:
```bash
cd server
# Make your changes
git add .
git commit -m "Your changes"
git push origin master
npx vercel --prod
```

### For Admin Panel Updates:
```bash
cd admin
# Make your changes
npm run build
firebase deploy --only hosting
git add .
git commit -m "Your changes"
git push origin master
```

### For Frontend Updates:
```bash
# Make your changes in peppinos/
firebase use production
firebase deploy --only hosting
git add .
git commit -m "Your changes"
git push origin master
```

## 🔍 Environment Configuration

### Development vs Production

| Component | Development | Production |
|-----------|-------------|------------|
| Backend | `http://localhost:5000` | `https://peppinos-backend.vercel.app` |
| Frontend | `http://localhost:3000` | `https://walthampeppinos.web.app` |
| Admin | `http://localhost:8081` | `https://peppinos-admin.web.app` |

### Configuration Files to Update:

1. **Backend** (`server/.env`):
   - `NODE_ENV=production`
   - `CLIENT_URL=https://walthampeppinos.web.app`
   - `ADMIN_URL=https://peppinos-admin.web.app`

2. **Frontend** (`peppinos/assets/js/config.js`):
   - `BASE_URL: 'https://peppinos-backend.vercel.app'`

3. **Admin** (`admin/.env`):
   - `VITE_API_URL=https://peppinos-backend.vercel.app`
   - `VITE_NODE_ENV=production`

## 🔧 Firebase Setup

### Initial Firebase Configuration

1. **Install Firebase CLI:**
```bash
npm install -g firebase-tools
```

2. **Login to Firebase:**
```bash
firebase login
```

3. **Initialize Projects:**
```bash
# For frontend (from root directory)
firebase init hosting
# Select walthampeppinos project
# Set public directory to: peppinos
# Configure as single-page app: No
# Set up automatic builds: No

# For admin panel (from admin directory)
cd admin
firebase init hosting
# Select peppinos-admin project
# Set public directory to: dist
# Configure as single-page app: Yes
# Set up automatic builds: No
```

### Firebase Project Configuration

The repository includes two Firebase configurations:

1. **Root `firebase.json`** (for frontend):
```json
{
  "hosting": {
    "public": "peppinos",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "destination": "https://peppinos-backend.vercel.app/api/**"
      }
    ]
  }
}
```

2. **Admin `firebase.json`** (for admin panel):
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## 🛠️ Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify `CLIENT_URL` and `ADMIN_URL` in backend `.env`
   - Check CORS configuration in `server/middleware/security-middleware.js`

2. **Build Failures**
   - Ensure all dependencies are installed: `npm install`
   - Check for TypeScript errors in admin panel
   - Verify environment variables are set correctly

3. **Deployment Failures**
   - Check Firebase CLI is logged in: `firebase login`
   - Verify project selection: `firebase use --add`
   - Ensure build directory exists before deployment

4. **API Connection Issues**
   - Verify backend is deployed and accessible
   - Check network requests in browser developer tools
   - Ensure API endpoints are correctly configured

### Useful Commands

```bash
# Check Firebase projects
firebase projects:list

# Check current Firebase project
firebase use

# Switch Firebase project
firebase use [project-id]

# View deployment history
firebase hosting:sites:list

# Check Vercel deployments
vercel ls

# View Vercel logs
vercel logs
```

## 📊 Production URLs

After successful deployment, your system will be available at:

- **Main Website**: https://walthampeppinos.web.app
- **Admin Panel**: https://peppinos-admin.web.app
- **Backend API**: https://peppinos-backend.vercel.app

## 🔐 Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **API Keys**: Use environment-specific keys for each deployment
3. **CORS**: Ensure only authorized domains can access your API
4. **HTTPS**: All production URLs use HTTPS by default
5. **Authentication**: Verify all authentication flows work in production

## 📝 Maintenance

### Regular Tasks
- Monitor application performance and errors
- Update dependencies regularly
- Backup database periodically
- Review and rotate API keys/secrets
- Monitor usage and costs

### Emergency Procedures
- **Rollback**: Use Vercel dashboard or `vercel rollback` command
- **Hotfix**: Deploy critical fixes immediately using `--prod` flag
- **Monitoring**: Set up alerts for downtime or errors

For additional support, refer to the official documentation of each platform or create an issue in the GitHub repository.
