# Fix 404 Error - Restart Backend

## The Problem
The backend server was started BEFORE the auth routes were created, so it doesn't have the routes loaded.

## Solution: Restart Backend Server

### Steps:

1. **Stop the current backend server:**
   - Go to the terminal where backend is running
   - Press `Ctrl + C` to stop it

2. **Start it again:**
   ```bash
   cd backend
   npm start
   ```

3. **You should see:**
   - "MongoDB connected successfully"
   - "Server running on port 5000"

4. **Now try registration again:**
   - Go to `http://localhost:5173`
   - Fill the form and register
   - Should work now! ✅

## Why This Happened

When you started the backend with `npm start`, the auth routes didn't exist yet. Node.js loads modules when the server starts, so it needs to be restarted to pick up new routes.

## Verify Routes Are Loaded

After restarting, test the endpoint:
```powershell
# Test health (should work)
Invoke-WebRequest -Uri 'http://localhost:5000/api/health' | Select-Object -ExpandProperty Content

# Test register endpoint (should work after restart)
$body = @{username='testuser';password='test123';regional_office_code='RO001'} | ConvertTo-Json
Invoke-WebRequest -Uri 'http://localhost:5000/api/auth/register' -Method POST -Body $body -ContentType 'application/json' | Select-Object -ExpandProperty Content
```

