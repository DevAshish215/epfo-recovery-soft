# 🚀 Quick Deployment Steps - EPFO Recovery Soft

## ⚡ Quick Checklist

### 1. MongoDB Atlas Setup (5 minutes)
- [ ] Sign up at https://www.mongodb.com/cloud/atlas/register
- [ ] Create FREE cluster (M0)
- [ ] Create database user (save password!)
- [ ] Whitelist IP: `0.0.0.0/0`
- [ ] Get connection string (replace `<password>` and `<dbname>`)

### 2. Push Code to GitHub (2 minutes)
```bash
git init
git add .
git commit -m "Ready for deployment"
# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/epfo-recovery-soft.git
git push -u origin main
```

### 3. Deploy Backend on Render (10 minutes)
- [ ] Sign up at https://render.com
- [ ] New → Web Service
- [ ] Connect GitHub repo
- [ ] Settings:
  - Name: `epfo-recovery-backend`
  - Root Directory: `backend`
  - Build: `npm install`
  - Start: `npm start`
  - Plan: **Free**
- [ ] Environment Variables:
  ```
  NODE_ENV=production
  PORT=10000
  MONGO_URI=your_mongodb_connection_string
  JWT_SECRET=your_secret_key
  GROQ_API_KEY=your_groq_key_from_console_groq_com
  FRONTEND_URL=https://epfo-recovery-frontend.onrender.com
  ```
- [ ] Deploy and **copy backend URL**

### 4. Deploy Frontend on Render (5 minutes)
- [ ] New → Static Site
- [ ] Connect same GitHub repo
- [ ] Settings:
  - Name: `epfo-recovery-frontend`
  - Root Directory: `frontend`
  - Build: `npm install && npm run build`
  - Publish: `dist`
  - Plan: **Free**
- [ ] Environment Variable:
  ```
  VITE_API_URL=https://epfo-recovery-backend.onrender.com/api
  ```
- [ ] Deploy and **copy frontend URL**

### 5. Update Backend CORS (2 minutes)
- [ ] Go to backend service → Environment
- [ ] Update `FRONTEND_URL` with your frontend URL
- [ ] Save (auto-redeploys)

### 6. Setup UptimeRobot (3 minutes)
- [ ] Sign up at https://uptimerobot.com
- [ ] Add New Monitor
- [ ] Type: HTTP(s)
- [ ] URL: `https://epfo-recovery-backend.onrender.com/api/health`
- [ ] Interval: 5 minutes
- [ ] Create Monitor

### 7. Test (2 minutes)
- [ ] Test backend: `https://epfo-recovery-backend.onrender.com/api/health`
- [ ] Test frontend: `https://epfo-recovery-frontend.onrender.com`
- [ ] Login and test features

---

## 📝 Important URLs to Save

After deployment, save these URLs:

- **Backend URL**: `https://epfo-recovery-backend.onrender.com`
- **Frontend URL**: `https://epfo-recovery-frontend.onrender.com`
- **Health Check**: `https://epfo-recovery-backend.onrender.com/api/health`
- **MongoDB Connection String**: (save securely)
- **Render Dashboard**: https://dashboard.render.com
- **UptimeRobot Dashboard**: https://uptimerobot.com

---

## 🔑 Environment Variables Reference

### Backend (Render)
```
NODE_ENV=production
PORT=10000
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority
JWT_SECRET=your_32_char_secret_key
GROQ_API_KEY=your_groq_key_from_console_groq_com
FRONTEND_URL=https://epfo-recovery-frontend.onrender.com
```

### Frontend (Render)
```
VITE_API_URL=https://epfo-recovery-backend.onrender.com/api
```

---

## ⚠️ Common Issues

**Backend won't start?**
- Check MongoDB connection string
- Verify all env variables are set
- Check Render build logs

**Frontend can't connect?**
- Verify VITE_API_URL is correct
- Check CORS settings in backend
- Update FRONTEND_URL in backend env

**Backend sleeps?**
- Check UptimeRobot monitor is active
- Verify health endpoint URL is correct
- Wait 5-10 minutes for pings to start

---

**Total Time**: ~30 minutes
**Total Cost**: $0/month

For detailed instructions, see `DEPLOYMENT_GUIDE.md`

