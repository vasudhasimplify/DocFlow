# Environment Variables Setup Guide

## Problem
The application is falling back to `localhost:8000` in production because environment variables are not being injected at build time.

## Solution

### For Vite Applications
Environment variables in Vite are **build-time** variables, not runtime. This means:
1. They are replaced during the build process
2. The production build needs these variables set BEFORE building
3. You cannot change them after the build is complete

### Deployment Platform Configuration

#### Option 1: Set Environment Variables in Your Deployment Platform

**For Vercel:**
1. Go to Project Settings → Environment Variables
2. Add these variables:
```
VITE_API_BASE_URL=https://your-backend-api.domain.com
VITE_BACKEND_URL=https://your-backend-api.domain.com
VITE_API_URL=https://your-backend-api.domain.com
VITE_FASTAPI_URL=https://your-backend-api.domain.com
VITE_BULK_API_URL=https://your-bulk-api.domain.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-key-here
```

**For Netlify:**
1. Go to Site Settings → Environment Variables
2. Add the same variables as above

**For Coolify:**
1. Go to your application → Environment Variables
2. Add the same variables as above

**For Railway/Render:**
1. Go to your service → Variables
2. Add the same variables as above

#### Option 2: Create `.env.production` File (NOT RECOMMENDED for sensitive data)

Create `.env.production` in the root directory:
```env
VITE_API_BASE_URL=https://your-backend-api.domain.com
VITE_BACKEND_URL=https://your-backend-api.domain.com
VITE_API_URL=https://your-backend-api.domain.com
VITE_FASTAPI_URL=https://your-backend-api.domain.com
VITE_BULK_API_URL=https://your-bulk-api.domain.com
```

⚠️ **Warning**: Do NOT commit sensitive keys to git. Only use this for non-sensitive URLs.

### Build Process

When building for production:
```bash
# Make sure environment variables are set first
npm run build
# or
yarn build
```

### Verification

After deployment, check the browser console. If you still see `localhost:8000`, it means:
1. Environment variables were not set during build
2. You need to rebuild with the correct variables

### Current Variable Usage

The application uses these environment variables:
- `VITE_API_BASE_URL` - Main backend API URL
- `VITE_BACKEND_URL` - Backend URL (for some services)
- `VITE_API_URL` - Alternative API URL (for legacy endpoints)
- `VITE_FASTAPI_URL` - FastAPI backend URL (for workflows)
- `VITE_BULK_API_URL` - Bulk operations API URL
- `VITE_BULK_WS_URL` - WebSocket URL for bulk operations

All have fallbacks to `http://localhost:8000` for local development.

### Troubleshooting

1. **Still seeing localhost in production?**
   - Check if environment variables are set in your deployment platform
   - Trigger a new deployment/rebuild
   - Verify the build logs show the environment variables being loaded

2. **Getting CORS errors?**
   - Make sure your backend allows requests from your frontend domain
   - Configure CORS on your backend to allow your production frontend URL

3. **API calls fail with 404?**
   - Verify your backend is actually deployed and accessible
   - Check the API URL is correct (with https://)
   - Make sure all API endpoints match between frontend and backend

### Example Production Configuration

```env
# Production Environment Variables
VITE_API_BASE_URL=https://api.docflow.example.com
VITE_BACKEND_URL=https://api.docflow.example.com
VITE_API_URL=https://api.docflow.example.com
VITE_FASTAPI_URL=https://api.docflow.example.com
VITE_BULK_API_URL=https://bulk.docflow.example.com
VITE_BULK_WS_URL=wss://bulk.docflow.example.com

# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...

# OAuth (update for production domains)
VITE_GOOGLE_CLIENT_ID=your-production-client-id
VITE_GOOGLE_REDIRECT_URI=https://docflow.example.com/auth/google/callback
VITE_MICROSOFT_CLIENT_ID=your-production-client-id
```
