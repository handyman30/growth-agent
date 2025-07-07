# HandyLabs Growth Agent 🚀

A powerful lead generation and outreach automation system that scrapes leads from Instagram and Google Maps, enriches them with email addresses, and sends personalized outreach campaigns.

## ✨ Features

- **🔍 Multi-Source Lead Generation**: Instagram and Google Maps scraping via Apify
- **📧 Email Enrichment**: Find business emails using Hunter.io API
- **📤 Automated Outreach**: Send personalized emails via SendGrid
- **📊 Web Dashboard**: Beautiful interface for managing leads and campaigns
- **🔄 Manual & Automated**: Run scrapers manually or on schedule
- **🛡️ Duplicate Detection**: Smart deduplication to avoid spam
- **📈 Real-time Stats**: Monitor performance and track results

## 🚀 Quick Start

### 1. Setup
```bash
git clone <your-repo>
cd handylabs-growth-agent
npm run setup
# Fill in your API keys in .env
```

### 2. Test Everything
```bash
npm run test:email      # Test SendGrid
npm run test:google     # Test Google scraper  
npm run test:instagram  # Test Instagram scraper
npm run dashboard       # Start dashboard
```

### 3. Open Dashboard
Visit http://localhost:3000 to start managing your leads!

## 🔧 Configuration

### Required API Keys
Add these to your `.env` file:

```env
# SendGrid (for email sending)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=your-verified-email@domain.com
FROM_NAME=Your Name

# Airtable (for data storage)
AIRTABLE_API_KEY=your-airtable-api-key
AIRTABLE_BASE_ID=your-base-id
AIRTABLE_TABLE_NAME=Leads

# Apify (for scraping)
APIFY_API_TOKEN=your-apify-token

# Hunter.io (for email enrichment)
HUNTER_API_KEY=your-hunter-api-key

# OpenAI (for message generation)
OPENAI_API_KEY=your-openai-api-key
```

### Airtable Setup
Create a table called "Leads" with these fields:
- Business Name (Single line text)
- Email (Email)
- Phone (Single line text)
- Instagram Handle (Single line text)
- Website (URL)
- Address (Long text)
- Category (Single select)
- City (Single line text)
- Status (Single select: new, contacted, replied, qualified)
- Source (Single select: instagram, google)
- Notes (Long text)
- Last Contacted At (Date)

## 📊 Dashboard Features

### Lead Management
- View all leads with filtering and search
- Enrich leads with email addresses
- Send personalized outreach emails
- Track lead status and engagement

### Scraper Configuration
- Create custom scraping configurations
- Set cities, categories, and keywords
- Schedule automatic scraping
- Run scrapers manually

### Email Campaigns
- Choose from pre-built email templates
- Send individual or bulk emails
- Track email delivery and opens
- Monitor campaign performance

## 🛠️ Development

### Project Structure
```
src/
├── dashboard/          # Web dashboard
├── scrapers/          # Lead scraping
├── email/             # Email functionality
├── utils/             # Shared utilities
├── templates/         # Message templates
└── types/             # TypeScript types
```

### Common Commands
```bash
npm run dashboard       # Start dashboard
npm run test:email      # Test email sending
npm run test:google     # Test Google scraper
npm run test:instagram  # Test Instagram scraper
npm run health          # System health check
npm run lint            # Code linting
npm run format          # Code formatting
```

### Adding Features
1. Follow the `.cursorrules` guidelines
2. Use TypeScript for all new code
3. Add proper error handling
4. Test your changes thoroughly
5. Update documentation

## 📈 Usage Examples

### Scrape Melbourne Cafes
1. Go to http://localhost:3000/config
2. Create new configuration:
   - Name: "Melbourne Cafes"
   - Sources: Google Maps
   - Cities: Melbourne
   - Categories: Cafe
   - Max Results: 50
3. Click "Run Scraper"

### Enrich Leads with Emails
1. Go to http://localhost:3000
2. Click "Enrich 10 Leads" button
3. Monitor Hunter.io credits
4. Check enriched leads in the list

### Send Outreach Campaign
1. Filter leads by "Has Email"
2. Select leads to contact
3. Choose email template
4. Send personalized emails
5. Track delivery in SendGrid

## 🔍 Troubleshooting

### Common Issues

**SendGrid shows 0 sent emails**
- Check Email Activity feed (not main dashboard)
- Verify sender email is authenticated
- Wait 5-15 minutes for stats to update

**Hunter.io enrichment fails**
- Check remaining credits
- Verify API key is correct
- Rate limit: 1 request per second

**Airtable field errors**
- Check field names match exactly (case-sensitive)
- Add missing fields in Airtable

**Scraping returns no results**
- Check Apify API token
- Verify actor is available
- Check account credits

### Debug Commands
```bash
# Check system health
npm run health

# Test individual services
npm run test:email
npm run test:google
npm run test:instagram

# Monitor logs
npm run dashboard  # Check console output
```

## 🚀 Deployment

### Railway (Recommended)
```bash
# Deploy to Railway
railway login
railway link
railway up
```

### Environment Variables
Set all required environment variables in your deployment platform.

## 📊 Performance

### Rate Limits
- **Hunter.io**: 1 request/second
- **SendGrid**: 100 emails/second
- **Apify**: Varies by plan

### Best Practices
- Enrich emails in batches of 10
- Send emails with delays (350ms)
- Monitor API credits regularly
- Use pagination for large datasets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the `.cursorrules` guidelines
4. Test your changes
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: Create GitHub issue
- **Questions**: Ask in Cursor with `/`
- **Documentation**: Check `DEVELOPMENT.md`

---

**Built with ❤️ by HandyLabs** 