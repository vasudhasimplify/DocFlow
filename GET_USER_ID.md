# How to Test AI Scoring with User Authentication

## ✅ Authentication Setup Complete!

I've configured the system to use **Supabase authentication**. The frontend automatically passes your user ID to the backend via the `X-User-Id` header.

## Quick Test Guide

### 1. **Get Your User ID** (2 ways)

#### Option A: From Browser Console
1. Open your app in the browser
2. Open DevTools (F12)
3. Go to Console tab
4. Run this command:
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('Your User ID:', user?.id);
```

#### Option B: From Application Tab
1. Open DevTools (F12)
2. Go to **Application** tab
3. Navigate to **Local Storage** → `http://localhost:5173`
4. Look for key starting with `sb-[project]-auth-token`
5. Click it and copy the `user.id` value from the JSON

### 2. **Test the AI Scoring**

#### Test Without Code (Using Browser):
1. Make sure you're logged into the app
2. Go to the **Quick Access** tab
3. Click the **"Update AI Scores"** button
4. The system will automatically use your authenticated user ID!

#### Test With PowerShell (Manual Testing):
```powershell
# Replace YOUR_USER_ID_HERE with your actual user ID
$userId = "YOUR_USER_ID_HERE"

# Test the AI scoring endpoint
$response = Invoke-WebRequest `
  -Uri "http://localhost:8000/api/v1/quick-access/scores" `
  -Method GET `
  -Headers @{"X-User-Id" = $userId} `
  -UseBasicParsing

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3
```

### 3. **Calculate AI Scores**
```powershell
# Calculate scores for your documents
$response = Invoke-WebRequest `
  -Uri "http://localhost:8000/api/v1/quick-access/calculate-scores/sync?limit=10" `
  -Method POST `
  -Headers @{
    "Content-Type" = "application/json"
    "X-User-Id" = $userId
  } `
  -UseBasicParsing

$response.Content | ConvertFrom-Json
```

## 🔍 How It Works

### Frontend → Backend Flow:
1. **Frontend**: User logs in via Supabase
2. **Frontend**: Stores session in localStorage
3. **Frontend**: On AI action, calls `supabase.auth.getUser()` to get user ID
4. **Frontend**: Passes user ID in `X-User-Id` header to backend
5. **Backend**: Extracts user ID from header
6. **Backend**: Queries database for that user's documents
7. **Backend**: Returns results

### Files Modified:
- ✅ `backend/app/api/quick_access.py` - Added header-based auth
- ✅ `src/services/quickAccessAI.ts` - Added user ID to all requests
- ✅ Frontend already has auth via `useAuth()` hook

## 📝 Important Notes

### Development vs Production:
- **Current Setup**: Uses `X-User-Id` header (simple for development)
- **Production**: Should validate JWT tokens from Supabase
- **Security**: Never trust client-provided user IDs in production!

### For Production (Future):
Replace the `get_current_user_id()` function in `quick_access.py` with JWT validation:

```python
from fastapi import Depends, HTTPException, Header
import jwt

async def get_current_user_id(
    authorization: str = Header(None)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        # Verify JWT token with Supabase
        payload = jwt.decode(
            token,
            os.getenv("SUPABASE_JWT_SECRET"),
            algorithms=["HS256"]
        )
        return payload["sub"]  # User ID
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

## 🚀 Testing Steps

1. **Start Backend**:
   ```powershell
   cd backend
   python run.py
   ```

2. **Start Frontend**:
   ```powershell
   cd ..
   npm run dev
   ```

3. **Login to App** (if not already logged in)

4. **Test AI Scoring**:
   - Navigate to Quick Access tab
   - Click "Update AI Scores" button
   - Wait for success toast
   - Check "AI Suggested" section for results

## 🐛 Troubleshooting

### Error: "User ID not provided"
- Make sure you're logged into the app
- Check browser console for auth errors
- Verify Supabase credentials in `.env`

### Error: "Not authenticated" (Frontend)
- Check if `supabase.auth.getUser()` returns a user
- Verify you're logged in
- Check localStorage for auth token

### No AI Scores Returned
- Make sure documents exist in your database
- Run the calculate endpoint first
- Check backend logs for errors
- Verify user ID matches documents in database

### Backend 500 Error
- Check backend terminal for error details
- Verify Supabase connection
- Make sure `quick_access` table exists
- Check database RLS policies allow access

## 📊 Database Setup

Make sure your `quick_access` table exists:

```sql
CREATE TABLE IF NOT EXISTS quick_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  access_count INTEGER DEFAULT 1,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  ai_score FLOAT DEFAULT 0,
  ai_reason TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

-- Index for fast queries
CREATE INDEX idx_quick_access_user_score ON quick_access(user_id, ai_score DESC);
```

---

**Ready to test!** Just log into your app and click the "Update AI Scores" button in the Quick Access tab. 🎉
