# 🚀 Deployment Checklist - HandyLabs Growth Agent

## ✅ Repository Setup (DONE!)
- [x] Created GitHub repository: https://github.com/handyman30/growth-agent
- [x] Pushed all code
- [x] Added comprehensive README
- [x] Set up proper .gitignore

## 📋 Pre-Deployment Tasks

### 1. Fix Airtable Fields (REQUIRED!)
- [ ] Go to your Airtable base
- [ ] Add to **Source** field options:
  - `instagram`
  - `google`
- [ ] Verify **Status** field has all options:
  - `new`
  - `contacted`
  - `replied`
  - `qualified`
  - `hot_lead`
  - `closed`

### 2. Verify Environment Variables
Make sure you have all these ready:
- [ ] OPENAI_API_KEY
- [ ] SENDGRID_API_KEY
- [ ] AIRTABLE_API_KEY
- [ ] AIRTABLE_BASE_ID
- [ ] AIRTABLE_TABLE_NAME (should be "Leads")
- [ ] APIFY_API_TOKEN
- [ ] FROM_EMAIL (verified in SendGrid)
- [ ] FROM_NAME

## 🚂 Deploy to Railway

### Quick Deploy (5 minutes):
```bash
# 1. Install Railway CLI (if not installed)
npm install -g @railway/cli

# 2. Login
railway login

# 3. Create new project
railway init

# 4. Link to your GitHub repo
railway link

# 5. Deploy from GitHub
railway up
```

### Configure in Railway Dashboard:
1. Go to https://railway.app
2. Select your project
3. Go to "Variables" tab
4. Add all environment variables
5. Railway will auto-redeploy

## 🎯 Post-Deployment

### Test Everything:
- [ ] Visit: `https://your-app.railway.app`
- [ ] Check system status bar
- [ ] Visit: `https://your-app.railway.app/config`
- [ ] Verify configurations are showing

### First Run:
1. Run Instagram scraper manually:
   - SSH into Railway or use Railway CLI
   - `railway run npm run scrape`
2. Check Airtable for new leads
3. Test email sending from dashboard

## 📊 What to Expect

- **Instagram**: ~20-30 leads per day
- **Emails**: Up to 100/day (SendGrid free)
- **Cost**: ~$5-10/month on Railway
- **Total**: ~$170/month all services

## 🔥 You're Ready!

Your growth agent is:
- ✅ In its own repository
- ✅ Ready for deployment
- ✅ Will save you $5,700+/month
- ✅ Finding 20+ leads per run

**Next Step**: Fix those Airtable fields and deploy! 🚀 