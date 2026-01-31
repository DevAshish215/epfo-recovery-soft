# EPFO Recovery Soft — Simple Deployment Guide

**From zero to live in ~30 minutes. Everything free.**

---

## What You Need

- GitHub account  
- MongoDB Atlas account  
- Render account  
- UptimeRobot account  

---

## Part 1: MongoDB Atlas (Database)

1. **Sign up**  
   https://cloud.mongodb.com → Create account (email or Google).

2. **Create cluster**  
   - Click **Build a Database**  
   - Choose **FREE** (M0)  
   - Pick region (e.g. Mumbai, Singapore)  
   - Name it (e.g. `epfo-cluster`)  
   - Click **Create**

3. **Create database user**  
   - Left sidebar → **Security** → **Database Access**  
   - Click **Add New Database User**  
   - Username: `epfo-admin` (or any)  
   - Password: **Autogenerate** → copy and save  
   - Role: **Atlas admin** or **Read and write to any database**  
   - Click **Add User**

4. **Allow network access**  
   - Left sidebar → **Security** → **Network Access**  
   - Click **Add IP Address**  
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`)  
   - Click **Confirm**

5. **Get connection string**  
   - Left sidebar → **Database** (or **Deployments**)  
   - Click **Connect** on your cluster  
   - Choose **Drivers** (or **Connect your application**)  
   - Driver: **Node.js**  
   - Copy the connection string  

   Replace:  
   - `<password>` → your database user password  
   - `<dbname>` → `epfo_recovery`  

   Example result:  
   `mongodb+srv://epfo-admin:YOUR_PASS@cluster0.xxxxx.mongodb.net/epfo_recovery?retryWrites=true&w=majority`  

   **Save this string.** You will use it in Render.

---

## Part 2: Push Code to GitHub

1. **Create repo on GitHub**  
   - https://github.com/new  
   - Name: `epfo-recovery-soft`  
   - Public  
   - Create repository (no README/gitignore)

2. **Push your project**
   ```bash
   cd "c:\Users\ashis\Downloads\EPFO RECOVERY SOFT 6.0"
   git init
   git add .
   git commit -m "EPFO Recovery Soft - deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/epfo-recovery-soft.git
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` with your GitHub username.

---

## Part 3: Deploy on Render

### Option A: Blueprint (Recommended — One Click)

1. Go to https://dashboard.render.com  
2. **New +** → **Blueprint**  
3. Connect GitHub → select `epfo-recovery-soft`  
4. Render reads `render.yaml` → Click **Apply**  
5. When prompted, enter:
   - **MONGO_URI** — your MongoDB connection string from Part 1  
   - **FRONTEND_URL** — use `https://epfo-recovery-frontend.onrender.com` (or your actual frontend URL after it exists)  
   - **VITE_API_URL** — use `https://epfo-recovery-backend.onrender.com/api` (replace with your actual backend URL)  
   - **GROQ_API_KEY** — optional; leave blank or add from https://console.groq.com  

6. Wait for both services to deploy (5–10 minutes)  
7. If you used placeholder URLs, go to each service → **Environment** → update `FRONTEND_URL` and `VITE_API_URL` with your real URLs → Save (auto-redeploys)

### Option B: Manual (Two Services)

**Backend**

1. **New +** → **Web Service**  
2. Connect GitHub → select `epfo-recovery-soft`  
3. Settings:
   - Name: `epfo-recovery-backend`
   - Root Directory: `backend`
   - Build: `npm install`
   - Start: `npm start`
   - Plan: **Free**
4. Environment variables (Add):
   | Key | Value |
   |-----|-------|
   | NODE_ENV | production |
   | MONGO_URI | *your connection string* |
   | JWT_SECRET | *any random 32+ char string* |
   | FRONTEND_URL | https://epfo-recovery-frontend.onrender.com |
   | GROQ_API_KEY | *optional* |
5. Create Web Service  
6. Copy backend URL (e.g. `https://epfo-recovery-backend.onrender.com`)

**Frontend**

1. **New +** → **Static Site**  
2. Connect same repo  
3. Settings:
   - Name: `epfo-recovery-frontend`
   - Root Directory: `frontend`
   - Build: `npm install && npm run build`
   - Publish Directory: `dist`
   - Plan: **Free**
4. Environment variable:
   | Key | Value |
   |-----|-------|
   | VITE_API_URL | https://epfo-recovery-backend.onrender.com/api |
5. Create Static Site  
6. Copy frontend URL

**Connect them**

- Backend → Environment → set `FRONTEND_URL` = your frontend URL → Save

---

## Part 4: Keep Backend Awake (Free Tier)

1. Sign up at https://uptimerobot.com  
2. **Add New Monitor**  
3. Type: **HTTP(s)**  
4. URL: `https://YOUR-BACKEND-URL.onrender.com/api/health`  
5. Interval: **5 minutes**  
6. Create Monitor  

This prevents the free backend from sleeping after 15 minutes.

---

## Part 5: Test

1. **Backend:** Open `https://YOUR-BACKEND-URL.onrender.com/api/health`  
   - Expect JSON with `"status": "ok"` and `"database": "connected"`

2. **Frontend:** Open `https://YOUR-FRONTEND-URL.onrender.com`  
   - App loads, login and main features work

3. If there are CORS errors: backend → Environment → ensure `FRONTEND_URL` matches the frontend URL exactly → Save

---

## Quick Reference

| Item | Example |
|------|---------|
| Backend URL | https://epfo-recovery-backend.onrender.com |
| Frontend URL | https://epfo-recovery-frontend.onrender.com |
| Health check | https://epfo-recovery-backend.onrender.com/api/health |

---

**Total time:** ~30 minutes  
**Cost:** $0/month
