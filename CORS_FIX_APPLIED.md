# CORS Configuration Fixed

## What Was Changed

Updated CORS configuration in both backends to allow all origins.

### Main Backend (`backend/app/main.py`)
Changed from restricted origins to:
```python
allow_origins=["*"]  # Allow all origins
```

### Bulk Backend (`backend-bulk/app/main.py`)
Already configured with:
```python
allow_origins=["*"]  # Via settings.CORS_ORIGINS
```

## ⚠️ IMPORTANT: Restart Required

You must restart your backend servers for the changes to take effect:

### Option 1: If running locally
```bash
# Stop your backend servers (Ctrl+C) and restart:
cd backend
python -m uvicorn app.main:app --reload --port 8000

# In another terminal for bulk backend:
cd backend-bulk
python -m uvicorn app.main:app --reload --port 8001
```

### Option 2: If deployed on Coolify/Docker
1. Go to your Coolify dashboard
2. Restart the backend services
3. OR redeploy the applications

## Verification

After restarting, check your browser console. The CORS errors should be gone:
- ✅ No more "Access-Control-Allow-Origin" errors
- ✅ API calls to workflows, document-fields, etc. should work

## Security Note

⚠️ **Production Recommendation**: For production, consider restricting CORS to specific origins:
```python
allow_origins=[
    "http://vw0k0g4gggs4wgsokcow0swg.108.137.190.73.sslip.io",
    "https://your-production-domain.com",
]
```

For now, `allow_origins=["*"]` is acceptable for development/testing.
