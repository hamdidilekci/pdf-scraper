# Deployment Guide - Vercel

Complete guide for deploying your PDF Scraper App to Vercel for the first time.

## Prerequisites

Before you start, make sure you have:

- ✅ Git installed
- ✅ Code committed to a Git repository (GitHub, GitLab, or Bitbucket)
- ✅ A Vercel account (free tier is fine)
- ✅ All environment variables documented
- ✅ Database accessible from the internet (e.g., hosted on Supabase, PlanetScale, Railway)

---

## Option 1: Deploy via GitHub (Recommended)

This is the easiest method and enables automatic deployments on every push.

### Step 1: Push Your Code to GitHub

If you haven't already:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - ready for deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### Step 2: Sign Up for Vercel

1. Go to https://vercel.com/signup
2. Click **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub account

### Step 3: Import Your Project

1. On Vercel Dashboard, click **"Add New..."** → **"Project"**
2. Select **"Import Git Repository"**
3. Find your repository and click **"Import"**
4. Vercel will auto-detect it's a Next.js project

### Step 4: Configure Project Settings

**Framework Preset:** Next.js (auto-detected)
**Root Directory:** `./` (leave as is)
**Build Command:** `npm run build` or `prisma generate && next build`
**Output Directory:** `.next` (auto-detected)
**Install Command:** `npm install`

### Step 5: Add Environment Variables

Click **"Environment Variables"** and add ALL of these:

```bash
# Database (Required)
DATABASE_URL=postgresql://user:password@host:5432/database
DIRECT_URL=postgresql://user:password@host:5432/database

# NextAuth (Required)
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://your-app.vercel.app

# Supabase (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_STORAGE_BUCKET=pdfs

# OpenAI (Required)
OPENAI_API_KEY=sk-...

# Email Service (Optional - for password reset)
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@yourdomain.com
APP_NAME=PDF Scraper App

# Stripe (Optional - for payments)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cron Job Security (Recommended)
CRON_SECRET=your_secure_random_secret

# Node Environment
NODE_ENV=production
```

**Important Notes:**

- For `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- For `NEXTAUTH_URL`: Use your Vercel domain (will update after first deploy)
- For `CRON_SECRET`: Generate with `openssl rand -hex 32`

### Step 6: Deploy

1. Click **"Deploy"**
2. Wait 2-5 minutes for build to complete
3. You'll get a URL like: `https://your-app.vercel.app`

### Step 7: Update NEXTAUTH_URL

1. Copy your deployment URL
2. Go to **Settings** → **Environment Variables**
3. Edit `NEXTAUTH_URL` to your actual URL: `https://your-app.vercel.app`
4. Click **"Redeploy"** (from Deployments tab)

---

## Post-Deployment Steps

### 1. Run Database Migrations

Your database needs to be synced with your Prisma schema:

```bash
# Option A: Using Vercel CLI
vercel env pull .env.production.local
npx prisma migrate deploy

# Option B: Add to your build command in Vercel
# Settings → General → Build Command:
npx prisma generate && npx prisma migrate deploy && next build
```

### 2. Verify Cron Jobs

1. Go to Vercel Dashboard → Your Project
2. Navigate to **Settings** → **Cron Jobs**
3. Verify `/api/cron/cleanup-rate-limits` appears with schedule `0 * * * *`

### 3. Set Up Stripe Webhooks (If Using Payments)

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Enter your webhook URL:
   ```
   https://your-app.vercel.app/api/webhooks/stripe
   ```
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `customer.deleted`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to Vercel environment variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
7. Redeploy

### 4. Configure Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Click **"Add"**
3. Enter your domain (e.g., `yourdomain.com`)
4. Follow DNS configuration instructions
5. Update `NEXTAUTH_URL` to your custom domain
6. Update Stripe webhook URL to custom domain

### 5. Test Your Deployment

#### Test Authentication:

1. Visit `https://your-app.vercel.app/sign-up`
2. Create an account
3. Try logging in

#### Test File Upload:

1. Login to your app
2. Upload a test PDF
3. Verify it processes correctly

#### Test Stripe (If Configured):

1. Go to Settings page
2. Try subscribing to a plan
3. Use Stripe test card: `4242 4242 4242 4242`

#### Test Cron Job:

```bash
curl https://your-app.vercel.app/api/cron/cleanup-rate-limits \
  -H "Authorization: Bearer your_cron_secret"
```

## Monitoring & Logs

### View Deployment Logs

1. Vercel Dashboard → Deployments
2. Click on a deployment
3. View build logs and runtime logs

### View Function Logs

1. Deployments → Select deployment
2. Click **Functions** tab
3. Click on a function to see its logs

### Set Up Alerts

1. Settings → Integrations
2. Add Slack, Discord, or Email notifications
3. Get alerted on deployment failures

---

## Continuous Deployment

With GitHub integration:

1. **Push to `main` branch** → Automatic production deployment
2. **Push to other branches** → Preview deployments
3. **Pull requests** → Preview deployments with unique URLs


## Rollback

If something goes wrong:

1. Go to **Deployments**
2. Find a previous working deployment
3. Click **"..."** → **"Promote to Production"**
4. Instant rollback!

---

## Next Steps

After successful deployment:

1. **Monitor**: Check logs for first few days
2. **Test**: Run through all critical user flows
3. **Backup**: Set up database backups
4. **Analytics**: Add analytics (Vercel Analytics, Google Analytics)
5. **Uptime**: Set up uptime monitoring (UptimeRobot, Better Stack)

---

## Quick Commands Reference

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Pull environment variables
vercel env pull

# Add environment variable
vercel env add VARIABLE_NAME production

# View logs
vercel logs

# List deployments
vercel ls

# Remove deployment
vercel rm deployment-url
```

---

**You're all set!** 🚀 Follow the steps above, and your app will be live in minutes!
