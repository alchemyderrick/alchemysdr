# Railway Deployment Checklist

## Pre-Deployment Steps

### 1. Build Frontend Locally (verify no errors)
```bash
cd frontend
npm run build
cd ..
```

Expected output: `frontend/out/` directory created with static files

### 2. Stage All Authentication Files
```bash
# New authentication files
git add lib/auth.js
git add frontend/app/login/
git add frontend/app/register/
git add frontend/app/admin/
git add frontend/middleware.ts
git add scripts/create-user.js

# Updated files for multi-user
git add server.js
git add lib/database.js
git add lib/workflow-engine.js
git add lib/x-auth.js
git add lib/x-search.js
git add routes/drafts.js
git add routes/contacts.js
git add routes/targets.js
git add frontend/components/providers.tsx
git add frontend/components/sidebar.tsx

# Configuration files
git add .gitignore
git add railway.toml
git add nixpacks.toml
git add .env.example
git add package.json
git add package-lock.json
git add frontend/package.json
git add frontend/package-lock.json

# Documentation
git add RAILWAY_DEPLOYMENT.md
git add DEPLOY_CHECKLIST.md
```

### 3. Verify .gitignore Excludes Sensitive Files
```bash
# Should be in .gitignore:
grep -E "(auth\.db|sessions\.db|databases/|\.env$)" .gitignore

# Expected output:
# auth.db
# sessions.db  
# databases/
# .env
```

### 4. Commit Changes
```bash
git commit -m "Deploy multi-user SDR Console with authentication

Features:
- Username/password authentication with bcrypt
- Per-employee SQLite databases (isolated data)
- Admin dashboard with impersonation
- Self-service user registration
- Session-based auth with express-session
- Persistent volume for employee databases
- Puppeteer dependencies for X/Apollo automation

Technical changes:
- Add lib/auth.js for user management
- Add login, register, admin pages
- Update server.js with auth middleware
- Add per-user database routing in lib/database.js
- Configure nixpacks.toml with Chromium dependencies
- Add persistent volume mount in railway.toml"
```

### 5. Push to Railway
```bash
git push origin main
```

## Railway Dashboard Configuration

### Set Environment Variables
Go to Railway → Your Service → Variables tab

#### Required Variables
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
APOLLO_API_KEY=your_apollo_key
NODE_ENV=production
PORT=3000
RAILWAY_ENVIRONMENT=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Generate these:
SESSION_SECRET=$(openssl rand -hex 32)
RELAYER_API_KEY=$(openssl rand -hex 32)
```

#### Optional Variables
```bash
# Telegram auto-send (recommended: false for safety)
AUTO_SEND_ENABLED=false

# Clay webhook
CLAY_WEBHOOK_URL=https://your-webhook-url
```

### Verify Persistent Volume
Settings → Volumes:
- Mount path: `/app/databases`
- Size: 1GB+
- If missing, create it before deploying

## Post-Deployment Steps

### 1. Monitor Build Logs
Watch for these stages:
- ✅ Installing dependencies
- ✅ Building frontend (frontend/out/ created)
- ✅ Starting server
- ✅ Database schema up to date

### 2. Create Admin User
Once deployment is live, create first admin user:

```bash
# Option A: Railway CLI
railway shell
node scripts/create-user.js

# Option B: Railway Dashboard → Shell tab
node scripts/create-user.js

# Follow prompts:
Username: derrick
Employee ID: derrick
Is admin? y
Password: <secure_password>
Confirm: <secure_password>
```

### 3. Verify Deployment
Visit: https://sdr-console-production.up.railway.app

#### Authentication Tests
- [ ] See login page (not home page)
- [ ] Login with admin credentials → redirects to home
- [ ] See Admin tab in sidebar
- [ ] Logout works
- [ ] Click "Create account" → registration page loads
- [ ] Register new user → auto-login → redirects to home
- [ ] New user has empty database (no targets/contacts)

#### Admin Dashboard Tests
- [ ] Click Admin tab → see all users
- [ ] Admin user shows "Admin" badge
- [ ] Stats show correct counts (0 for new users)
- [ ] Click "View Console" → impersonate user
- [ ] See "Viewing as: username" in sidebar
- [ ] Stop impersonating → return to admin dashboard

#### Database Isolation Tests
- [ ] Login as User A
- [ ] Add target in Research Teams
- [ ] Logout, login as User B
- [ ] User B does not see User A's target
- [ ] Add User B's own target
- [ ] Admin can see both users' data separately

#### Puppeteer/Automation Tests
- [ ] Add a target with company
- [ ] Click "Search Contacts" → Apollo search works
- [ ] Check server logs for Puppeteer errors
- [ ] If X auth needed, set X_COOKIES env var

### 4. Common Issues & Solutions

#### Issue: "Chrome not found" in logs
**Solution**: Verify PUPPETEER_EXECUTABLE_PATH is set:
```bash
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

#### Issue: Frontend shows 404 or blank page
**Solution**: Check build logs for "Building frontend..." success
```bash
railway logs | grep "Building frontend"
```

#### Issue: "createUser is not defined"
**Solution**: Verify lib/auth.js is committed and pushed:
```bash
git ls-files lib/auth.js
```

#### Issue: Session not persisting
**Solution**: Verify SESSION_SECRET is set in Railway env vars

#### Issue: Target count shows wrong number
**Solution**: Ensure latest server.js is deployed with status filter:
```javascript
targets: empDb.prepare("SELECT COUNT(*) as count FROM targets WHERE status = 'approved'").get()
```

#### Issue: Volume not persisting data
**Solution**: 
1. Check Volume is mounted at `/app/databases`
2. Verify railway.toml has volume config:
```toml
[[volumes]]
mountPath = "/app/databases"
```

## Rollback Plan

If deployment fails:

### Quick Rollback (Railway Dashboard)
1. Go to Deployments tab
2. Find last successful deployment
3. Click "⋮" menu → "Redeploy"

### Git Rollback
```bash
# Find last working commit
git log --oneline -5

# Reset to that commit
git reset --hard <commit_hash>

# Force push
git push origin main --force
```

## Monitoring

### View Logs
```bash
# Railway CLI
railway logs --tail

# Or in Railway dashboard → Logs tab
```

### Check Database Status
```bash
railway shell

# List employee databases
ls -la databases/

# Check auth database
sqlite3 auth.db "SELECT username, is_admin, created_at FROM users;"

# Check specific employee database
sqlite3 databases/derrick/data.db "SELECT COUNT(*) FROM targets WHERE status='approved';"
```

### Monitor Resource Usage
Railway dashboard → Metrics:
- CPU usage
- Memory usage
- Disk usage (volume)
- Network traffic

## Success Criteria

✅ All checks must pass:

1. **Authentication**
   - Login page loads at root URL
   - Admin can login successfully
   - Users can self-register
   - Sessions persist across page refreshes
   - Logout works correctly

2. **Admin Features**
   - Admin tab visible only to admins
   - Admin dashboard shows all users
   - Stats are accurate (approved targets only)
   - Impersonation works
   - Stop impersonation works

3. **Database Isolation**
   - Each user has separate database
   - Users cannot see other users' data
   - Admin can view all users' data
   - Databases persist across deployments

4. **Automation**
   - Puppeteer launches successfully
   - Apollo API searches work
   - Claude API message generation works
   - No Chrome-related errors in logs

5. **Performance**
   - Pages load within 2-3 seconds
   - API calls respond quickly
   - No memory leaks in logs
   - Volume has sufficient space

## Next Steps After Successful Deployment

1. Share Railway URL with team members
2. Instruct users to create accounts via registration page
3. Promote first user to admin if needed (via create-user script)
4. Set up relayer clients for employees (optional)
5. Configure X authentication per employee (if using X discovery)
6. Monitor usage and costs in Railway dashboard
7. Set up alerts for deployment failures

## Support

If you encounter issues not covered here:
1. Check Railway logs for error messages
2. Verify all environment variables are set
3. Test locally with same Node.js version
4. Check Railway Discord for community help
5. Review Railway docs: https://docs.railway.app
