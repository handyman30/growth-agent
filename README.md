# HandyLabs Growth Agent 🚀

An AI-powered growth marketing automation tool that finds and contacts potential clients through Instagram and Google Maps.

## 🎯 Features

- **Multi-Source Lead Discovery**: Scrapes Instagram hashtags and Google Maps
- **Smart Business Detection**: AI identifies real businesses vs personal accounts
- **Automated Outreach**: Personalized email generation with GPT-4
- **Multi-City Support**: Target multiple Australian cities simultaneously
- **Real-Time Dashboard**: Monitor leads, activities, and system health
- **Cost Effective**: ~$170/month vs $5,700/month for a contractor

## 📊 Results

- Finds 20-30 qualified leads per day
- Extracts emails/phones from Instagram bios
- Tracks all activities in Airtable
- Saves immediately as leads are found

## 🛠️ Tech Stack

- **Backend**: Node.js, TypeScript, Express
- **Scraping**: Puppeteer (Google), Apify (Instagram)
- **AI**: OpenAI GPT-4
- **Email**: SendGrid
- **Database**: Airtable
- **Deployment**: Railway

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/handylabs-growth-agent.git
cd handylabs-growth-agent
npm install
```

### 2. Configure Environment

```bash
cp env.example .env
# Edit .env with your API keys
```

### 3. Setup Airtable

Create a table called "Leads" with these fields:
- Business Name (Single line text)
- Owner Name (Single line text)
- Email (Email)
- Phone (Phone)
- Instagram Handle (Single line text)
- Website (URL)
- Address (Long text)
- Bio (Long text)
- Description (Long text)
- Follower Count (Number)
- Rating (Number)
- Review Count (Number)
- Category (Single line text)
- City (Single line text)
- Location (Long text)
- Status (Single select): new, contacted, replied, qualified, hot_lead, closed
- Source (Single select): instagram, google
- Recent Posts (Long text)
- Business Hours (Long text)
- Notes (Long text)
- Last Contacted At (Date)
- Created At (Created time)

### 4. Run Development

```bash
npm run dev          # Run with auto-reload
npm run dashboard    # Start dashboard at localhost:3000
npm run scrape       # Run Instagram scraper
npm run scrape:google # Run Google scraper
```

### 5. Deploy to Railway

See [README-DEPLOYMENT.md](README-DEPLOYMENT.md) for detailed deployment instructions.

## 📅 Cron Schedule

- **Instagram Scraping**: Daily at 8 AM Melbourne time
- **Email Campaign**: Daily at 9 AM Melbourne time
- **Google Scraping**: Every 3 hours

## 💰 Cost Breakdown

- Apify: Free tier (Instagram scraping)
- OpenAI: ~$10-20/month
- SendGrid: Free tier (100 emails/day)
- Airtable: Free tier
- Railway: ~$5-10/month
- **Total**: ~$120-170/month

## 🔧 Configuration

Visit `/config` in the dashboard to:
- Create search configurations
- Set target cities and categories
- Configure Instagram hashtags
- Enable/disable searches

## 📈 Dashboard

The dashboard (`/`) shows:
- Real-time system status
- Lead management interface
- Email/DM generation
- Activity feed
- Error monitoring

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

MIT License - feel free to use this for your own business!

## 🙋 Support

Created by HandyLabs - reach out if you need help setting this up for your business. 