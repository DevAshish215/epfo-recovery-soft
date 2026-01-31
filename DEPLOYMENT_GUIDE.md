# 🚀 EPFO Recovery Soft - Free Deployment Guide

Complete step-by-step guide to deploy your EPFO Recovery Soft application for **FREE** on Render.

---

## 📋 Prerequisites

- [ ] GitHub account (free)
- [ ] MongoDB Atlas account (free tier)
- [ ] Render account (free tier)
- [ ] UptimeRobot account (free tier)
- [ ] Your code pushed to GitHub

---

## 🗄️ Step 1: Set Up MongoDB Atlas (Database)

**Already have a cluster and see your collections?** Skip 1.1–1.2. Go to **Security → Database Access** to use an existing user or add one, then **Security → Network Access** to allow `0.0.0.0/0`, and **Database → Connect** to get your connection string.

### 1.1 Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with email or Google account
3. Verify your email

### 1.2 Create Free Cluster
1. Click "Build a Database"
2. Choose **FREE** (M0) tier
3. Select cloud provider: **AWS** (recommended)
4. Select region closest to you (e.g., Mumbai for India)
5. Cluster name: `epfo-recovery-cluster` (or any name)
6. Click "Create"
7. If Atlas asks you to create a user during cluster setup, do it there — you can use that user for the app.

### 1.3 Create Database User (for your app’s connection string)

**Where to go:** [MongoDB Atlas](https://cloud.mongodb.com/) → left sidebar → **Security** → **Database Access**.

*(Database Access is under **Security**, not under Database / Collections. The "Collections" view is for browsing data; user management is separate.)*

1. Open **Security** in the left sidebar, then **Database Access**.
2. Click **"Add New Database User"** (top right).  
   - If you don’t see it: ensure you’re in **Database Access**, not "Database" or "Network Access".  
   - If you already have a user from cluster creation, you can use that user — just note its username and password (or reset password via **Edit**).
3. **Authentication method:** Password.
4. **Username:** e.g. `epfo-admin` (or your choice).
5. **Password:** Autogenerate secure password and **save it** (you’ll need it for `MONGO_URI`).
6. **Database User Privileges:**  
   - Choose **"Atlas admin"** or **"Read and write to any database"**.
7. Click **"Add User"** (or **"Create Database User"**).

### 1.4 Whitelist IP Address
1. Go to **Security** → **Network Access** (left sidebar)
2. Click **"Add IP Address"** or **"Add Entry"**
3. Click "Allow Access from Anywhere" (for Render deployment)
   - Or add specific IP: `0.0.0.0/0`
4. Click "Confirm"

### 1.5 Get Connection String
1. Go to **Database** (or **Deployments**) in the left sidebar
2. Click **"Connect"** on your cluster
3. Choose "Connect your application"
4. Driver: Node.js, Version: 5.5 or later
5. Copy the connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority`
6. **Replace `<password>` with your actual password**
7. **Replace `<dbname>` with `epfo_recovery`** (or your preferred database name)
8. **Save this connection string** — you'll need it for Render!

---

## 🚀 Step 2: Deploy Backend to Render

### 2.1 Push Code to GitHub
1. If not already done, initialize git:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for deployment"
   ```

2. Create a new repository on GitHub:
   - Go to https://github.com/new
   - Repository name: `epfo-recovery-soft`
   - Make it **Public** (required for free Render tier)
   - Click "Create repository"

3. Push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/epfo-recovery-soft.git
   git branch -M main
   git push -u origin main
   ```

### 2.2 Create Render Account
1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub (recommended) or email
4. Verify your email

### 2.3 Deploy Backend Web Service
1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository:
   - Click "Connect GitHub"
   - Authorize Render
   - Select repository: `epfo-recovery-soft`
   - Click "Connect"

3. Configure the service:
   - **Name**: `epfo-recovery-backend`
   - **Environment**: `Node`
   - **Region**: Choose closest to you (e.g., Singapore, Oregon)
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: **Free**

4. Add Environment Variables (click "Advanced"):
   ```
   NODE_ENV=production
   MONGO_URI=mongodb+srv://epfo-admin:YOUR_PASSWORD@epfo-recovery-cluster.xxxxx.mongodb.net/epfo_recovery?retryWrites=true&w=majority
   JWT_SECRET=your_very_secure_random_secret_key_here_min_32_chars
   GROQ_API_KEY=your_groq_api_key_from_console_groq_com
   FRONTEND_URL=https://epfo-recovery-frontend.onrender.com
   ```
   **Note**:
   - Replace `YOUR_PASSWORD` with your MongoDB password
   - Replace `epfo-recovery-cluster.xxxxx` with your actual cluster URL
   - Generate a strong JWT_SECRET (e.g. `openssl rand -base64 32`)
   - Get GROQ_API_KEY from https://console.groq.com (optional, if using Groq features)
   - Set `FRONTEND_URL` after frontend is deployed (use your actual frontend URL)

5. Click **"Create Web Service"**

6. Wait for deployment (5–10 minutes)
   - Watch the build logs
   - You should see "MongoDB connected successfully"
   - You should see "Server running on port ..." (Render sets PORT automatically)

7. **Copy your backend URL** (e.g. `https://epfo-recovery-backend.onrender.com`)
   - Use this for frontend configuration

---

## 🎨 Step 3: Deploy Frontend to Render

### 3.1 Deploy Frontend Static Site
1. In Render dashboard, click **"New +"** → **"Static Site"**
2. Connect your GitHub repository:
   - Select repository: `epfo-recovery-soft`
   - Click "Connect"

3. Configure the service:
   - **Name**: `epfo-recovery-frontend`
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Plan**: **Free**

4. Add Environment Variable:
   ```
   VITE_API_URL=https://epfo-recovery-backend.onrender.com/api
   ```
   Replace with your actual backend URL from Step 2.7 (include `/api`).

5. Click **"Create Static Site"**

6. Wait for deployment (3–5 minutes)

7. **Copy your frontend URL** (e.g. `https://epfo-recovery-frontend.onrender.com`)

### 3.2 Update Backend CORS
1. Go back to your backend service in Render
2. Open the "Environment" tab
3. Set or update `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://epfo-recovery-frontend.onrender.com
   ```
   Use your actual frontend URL (no trailing slash).
4. Click "Save Changes"
5. Render will redeploy the backend automatically

---

## ⏰ Step 4: Set Up UptimeRobot (Keep Backend Awake)

### 4.1 Create UptimeRobot Account
1. Go to https://uptimerobot.com
2. Click "Sign Up" (free)
3. Sign up with email or Google
4. Verify your email

### 4.2 Add Monitor
1. In dashboard, click **"Add New Monitor"**
2. Configure:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `EPFO Recovery Backend`
   - **URL**: `https://epfo-recovery-backend.onrender.com/api/health`  
     (use your actual backend URL)
   - **Monitoring Interval**: `5 minutes` (free tier)
   - **HTTP Method**: `GET`
   - **Expected Status Code**: `200`
   - **Alert Contacts**: Add your email (optional)

3. Click **"Create Monitor"**

4. Wait 1–2 minutes and confirm it shows "Up" (green)

### 4.3 Verify It's Working
1. Wait ~20 minutes after setup
2. Open `https://epfo-recovery-backend.onrender.com/api/health`
3. It should respond quickly (no cold start) when UptimeRobot is pinging

---

## ✅ Step 5: Test Your Deployment

### 5.1 Test Backend
1. Open: `https://epfo-recovery-backend.onrender.com/api/health`
2. You should see something like:
   ```json
   {
     "status": "ok",
     "timestamp": "...",
     "uptime": 123,
     "database": "connected",
     "service": "EPFO Recovery Soft Backend",
     "version": "6.0"
   }
   ```

### 5.2 Test Frontend
1. Open: `https://epfo-recovery-frontend.onrender.com`
2. The app should load
3. Try logging in and using main features

### 5.3 Verify API Connection
1. Open browser DevTools (F12) → Network tab
2. Use the app (login, etc.)
3. API requests should go to `https://epfo-recovery-backend.onrender.com/api/...`
4. There should be no CORS errors

---

## 🔧 Troubleshooting

### Backend Issues

**Problem**: Backend deployment fails  
- **Solution**: Check build logs in Render, confirm all environment variables are set, and verify MongoDB connection string format.

**Problem**: MongoDB connection fails  
- **Solution**: Ensure IP allowlist includes `0.0.0.0/0`, username/password in the URI are correct, and the database name is correct.

**Problem**: Backend sleeps (cold start)  
- **Solution**: Confirm UptimeRobot monitor is active, the URL is correct, and wait a few minutes for pings to take effect.

### Frontend Issues

**Problem**: Frontend can't connect to backend  
- **Solution**: Check `VITE_API_URL` (must end with `/api`), confirm in browser console/Network tab, and ensure CORS is configured.

**Problem**: CORS errors  
- **Solution**: Set `FRONTEND_URL` in the backend to your exact frontend URL (no trailing slash) and redeploy the backend.

### General Issues

**Problem**: Build fails  
- **Solution**: Check `package.json` scripts, that all dependencies are listed, and build logs for the exact error.

### MongoDB Atlas / Database User

**Problem**: I don’t see "Add New Database User"  
- **Solution**: Go to **Security → Database Access** (left sidebar). "Add user" is there, not under Database/Collections. If you created the cluster, you may already have a user — use **Edit** to see or reset the password.

**Problem**: I can see my collections but not Database Access  
- **Solution**: Collections live under **Database** (or **Deployments**). User management is under **Security → Database Access**. Use the same cluster; the app connects via a *database user* (username/password in `MONGO_URI`).

---

## 📊 Monitoring & Maintenance

### UptimeRobot Dashboard
- Monitor backend uptime
- Email alerts when the backend is down
- View response times

### Render Dashboard
- Deployment logs
- Resource usage
- Environment variables
- Service status

### MongoDB Atlas Dashboard
- Database usage
- Connection stats
- Storage (512MB free limit)

---

## 💰 Cost Summary

| Service        | Plan  | Cost       |
|----------------|-------|------------|
| Render Backend | Free  | $0/month   |
| Render Frontend| Free  | $0/month   |
| MongoDB Atlas  | Free (M0) | $0/month |
| UptimeRobot    | Free  | $0/month   |
| **Total**      |       | **$0/month** |

---

## 📝 Important Notes

### Free Tier Limitations

1. **Render Backend**
   - Sleeps after ~15 min inactivity (UptimeRobot mitigates this)
   - 750 hours/month
   - 512MB RAM

2. **Render Frontend**
   - Always on
   - 100GB bandwidth/month
   - Unlimited builds

3. **MongoDB Atlas**
   - 512MB storage
   - Shared cluster
   - 100 connections

### Best Practices

1. **Keep UptimeRobot active** to avoid cold starts.
2. **Monitor usage** to stay within free limits.
3. **Back up data** periodically (e.g. Atlas exports).
4. **Update dependencies** and **check Render logs** regularly.

---

## 🎉 Success!

Your EPFO Recovery Soft app should now be live.

- **Frontend**: `https://epfo-recovery-frontend.onrender.com`
- **Backend**: `https://epfo-recovery-backend.onrender.com`
- **Health check**: `https://epfo-recovery-backend.onrender.com/api/health`

---

## 📞 Need Help?

If something fails:

1. Check Render deployment and runtime logs
2. Verify MongoDB Atlas connection and env vars
3. Test `/api/health` manually
4. Confirm UptimeRobot monitor is up

---

**Alternative: Blueprint deploy**  
You can also use the `render.yaml` Blueprint and follow **RENDER_DEPLOY.md** for a single Blueprint-based deploy.

**Last Updated**: January 2025  
**Version**: 6.0
