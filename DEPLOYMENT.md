# Peppino's Restaurant Backend - Deployment Guide

## Overview
This guide covers the deployment of Peppino's Restaurant backend to Vercel with production-ready security configurations.

## Prerequisites

### 1. Accounts Required
- [Vercel Account](https://vercel.com)
- [MongoDB Atlas Account](https://www.mongodb.com/cloud/atlas)
- [Cloudinary Account](https://cloudinary.com)
- [Stripe Account](https://stripe.com)
- [Kinde Account](https://kinde.com)
- [Gmail Account](https://gmail.com) (for email services)

### 2. Development Tools
- Node.js 18+ installed
- Git installed
- Vercel CLI installed (`npm i -g vercel`)

## Pre-Deployment Setup

### 1. Environment Variables
Copy `.env.production` to `.env` and update all values:

```bash
cp server/.env.production server/.env
```

**Critical Variables to Update:**
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `JWT_SECRET`: Generate a strong 32+ character secret
- `JWT_REFRESH_SECRET`: Generate another strong secret
- `KINDE_*`: Your Kinde OAuth credentials
- `CLOUDINARY_*`: Your Cloudinary credentials
- `STRIPE_*`: Your Stripe production keys
- `EMAIL_*`: Your email service credentials
- `CLIENT_URL`: Your frontend domain
- `ADMIN_URL`: Your admin frontend domain

### 2. Database Setup
1. Create MongoDB Atlas cluster
2. Whitelist Vercel IP ranges (0.0.0.0/0 for serverless)
3. Create database user with read/write permissions
4. Test connection string locally

### 3. Third-Party Service Configuration

#### Kinde OAuth
1. Create production application
2. Set redirect URI: `https://your-api-domain.vercel.app/api/auth/kinde/callback`
3. Set logout URI: `https://your-frontend-domain.vercel.app`

#### Stripe
1. Switch to live mode
2. Configure webhooks endpoint: `https://your-api-domain.vercel.app/api/webhooks/stripe`
3. Enable required events: `payment_intent.succeeded`, `payment_intent.payment_failed`

#### Cloudinary
1. Create production environment
2. Configure upload presets
3. Set folder structure for organization

## Deployment Steps

### 1. Prepare Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI
```bash
# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variables
vercel env add MONGODB_URI
vercel env add JWT_SECRET
# ... add all other environment variables
```

#### Option B: Vercel Dashboard
1. Connect GitHub repository
2. Import project
3. Configure build settings:
   - Framework Preset: Other
   - Build Command: `cd server && npm install`
   - Output Directory: `server`
   - Install Command: `npm install`

### 3. Configure Environment Variables in Vercel
Add all environment variables from `.env.production` in Vercel dashboard:
1. Go to Project Settings
2. Navigate to Environment Variables
3. Add each variable for Production environment

### 4. Configure Custom Domain (Optional)
1. Add custom domain in Vercel dashboard
2. Update DNS records as instructed
3. Update environment variables with new domain

## Post-Deployment Configuration

### 1. Test API Endpoints
```bash
# Test health check
curl https://your-api-domain.vercel.app/api/health

# Test authentication
curl -X POST https://your-api-domain.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"Test123"}'
```

### 2. Configure Frontend
Update frontend environment variables:
```env
NEXT_PUBLIC_API_URL=https://your-api-domain.vercel.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 3. Set Up Monitoring

#### Error Tracking (Sentry)
```bash
npm install @sentry/node
```

#### Performance Monitoring
- Enable Vercel Analytics
- Configure New Relic (optional)
- Set up custom logging

## Security Checklist

### ✅ Pre-Deployment Security
- [ ] All secrets are environment variables
- [ ] No hardcoded credentials in code
- [ ] Strong JWT secrets (32+ characters)
- [ ] CORS configured for specific domains
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] SQL injection protection (MongoDB sanitization)
- [ ] XSS protection enabled

### ✅ Production Security
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] IP whitelisting for admin routes (optional)
- [ ] API key authentication for sensitive endpoints
- [ ] File upload restrictions
- [ ] Request logging enabled
- [ ] Error handling doesn't expose sensitive info

## Monitoring and Maintenance

### 1. Health Checks
Set up monitoring for:
- API availability
- Database connectivity
- Third-party service status
- Error rates
- Response times

### 2. Backup Strategy
- MongoDB Atlas automatic backups
- Environment variables backup
- Code repository backup

### 3. Update Process
```bash
# For updates
git pull origin main
vercel --prod
```

## Troubleshooting

### Common Issues

#### 1. Function Timeout
- Increase `maxDuration` in `vercel.json`
- Optimize database queries
- Implement caching

#### 2. Cold Start Issues
- Implement connection pooling
- Use Vercel Edge Functions for critical paths
- Optimize bundle size

#### 3. CORS Errors
- Verify allowed origins in environment variables
- Check Vercel headers configuration
- Ensure credentials are properly configured

#### 4. Database Connection Issues
- Verify MongoDB Atlas IP whitelist
- Check connection string format
- Ensure database user permissions

### Logs and Debugging
```bash
# View function logs
vercel logs

# View real-time logs
vercel logs --follow
```

## Performance Optimization

### 1. Database Optimization
- Create proper indexes
- Implement connection pooling
- Use aggregation pipelines efficiently

### 2. Caching Strategy
- Implement Redis for session storage
- Cache frequently accessed data
- Use CDN for static assets

### 3. Bundle Optimization
- Remove unused dependencies
- Implement tree shaking
- Optimize images and assets

## Support and Resources

### Documentation
- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com)
- [Stripe Documentation](https://stripe.com/docs)

### Community
- [Vercel Discord](https://discord.gg/vercel)
- [MongoDB Community](https://community.mongodb.com)

## Emergency Procedures

### 1. Rollback
```bash
# Rollback to previous deployment
vercel rollback
```

### 2. Emergency Maintenance
- Enable maintenance mode
- Redirect traffic to status page
- Communicate with users

### 3. Security Incident Response
- Rotate compromised secrets immediately
- Review access logs
- Update security measures
- Notify affected users if required
