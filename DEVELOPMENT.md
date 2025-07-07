# HandyLabs Growth Agent - Development Guide

## 🚀 Quick Start

1. **Clone and setup**:
   ```bash
   git clone <your-repo>
   cd handylabs-growth-agent
   npm install
   cp env.example .env
   # Fill in your API keys
   ```

2. **Test everything**:
   ```bash
   npm run test:google      # Test Google scraper
   npm run test:instagram   # Test Instagram scraper
   npx tsx src/utils/test-sendgrid.ts  # Test email sending
   npm run dashboard        # Start dashboard
   ```

3. **Open in Cursor**:
   - The `.cursorrules` file will guide the AI
   - Use `/` to ask questions about the codebase
   - Ask for improvements, new features, or bug fixes

## 📁 Project Structure

```
handylabs-growth-agent/
├── src/
│   ├── dashboard/          # Web dashboard
│   │   ├── server.ts       # Express server
│   │   └── public/         # Frontend files
│   ├── scrapers/           # Lead scraping
│   │   ├── instagram.ts    # Instagram scraper
│   │   └── google.ts       # Google Maps scraper
│   ├── email/              # Email functionality
│   │   └── sender.ts       # SendGrid integration
│   ├── utils/              # Shared utilities
│   │   ├── airtable.ts     # Database operations
│   │   ├── email-enrichment.ts  # Hunter.io integration
│   │   └── test-sendgrid.ts     # Email testing
│   ├── templates/          # Message templates
│   └── types/              # TypeScript types
├── .cursorrules            # Cursor AI rules
├── .cursorignore           # Files to ignore
└── README.md               # Main documentation
```

## 🔧 Common Development Tasks

### Adding a New Scraper

1. **Create the scraper** (`src/scrapers/new-source.ts`):
   ```typescript
   export async function scrapeNewSourceForLeads(
     city: string,
     category: string,
     maxResults: number = 50
   ): Promise<Lead[]> {
     // Implementation
   }
   ```

2. **Add to dashboard** (`src/dashboard/server.ts`):
   ```typescript
   // Add import
   import { scrapeNewSourceForLeads } from '../scrapers/new-source.js';
   
   // Add to manual run endpoint
   if (config.sources.includes('new-source')) {
     // Implementation
   }
   ```

3. **Update types** (`src/types/index.ts`):
   ```typescript
   export type LeadSource = 'instagram' | 'google' | 'new-source';
   ```

### Adding Email Templates

1. **Add template** (`src/templates/email-templates.ts`):
   ```typescript
   export const NEW_TEMPLATE = {
     subject: 'Your Subject',
     body: 'Your email body with {{businessName}} placeholders',
     category: 'restaurant'
   };
   ```

2. **Test in dashboard**:
   - Go to http://localhost:3000
   - Select a lead with email
   - Choose your new template

### Improving the Dashboard

1. **Add API endpoint** (`src/dashboard/server.ts`):
   ```typescript
   app.get('/api/new-feature', async (req, res) => {
     // Implementation
   });
   ```

2. **Update frontend** (`src/dashboard/public/index.html`):
   ```javascript
   async function newFeature() {
     const response = await fetch('/api/new-feature');
     // Implementation
   }
   ```

## 🧪 Testing

### Individual Services
```bash
# Test scrapers
npm run test:google
npm run test:instagram

# Test email
npx tsx src/utils/test-sendgrid.ts

# Test Hunter.io
curl http://localhost:3000/api/hunter-credits
```

### Full System
```bash
# Start dashboard
npm run dashboard

# Test enrichment
curl -X POST http://localhost:3000/api/enrich-all-emails \
  -H "Content-Type: application/json" \
  -d '{"limit": 3}'

# Test email sending
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{"leadId": "rec123", "templateId": "cafe-initial"}'
```

## 🔍 Debugging

### Common Issues

1. **"Unknown field name" in Airtable**:
   - Check field names match exactly (case-sensitive)
   - Add missing fields in Airtable

2. **SendGrid shows 0 sent**:
   - Check Email Activity feed (not main dashboard)
   - Verify sender email is authenticated
   - Wait 5-15 minutes for stats to update

3. **Hunter.io errors**:
   - Check remaining credits
   - Verify API key is correct
   - Rate limit: 1 request per second

4. **Apify scraping fails**:
   - Check API token
   - Verify actor is available
   - Check account credits

### Logs to Check
```bash
# Dashboard logs
npm run dashboard

# Check for errors
grep -i error logs/*.log

# Monitor API calls
tail -f logs/api.log
```

## 🚀 Deployment

### Railway (Current)
```bash
# Deploy to Railway
railway login
railway link
railway up
```

### Environment Variables
Set these in Railway dashboard:
- `SENDGRID_API_KEY`
- `AIRTABLE_API_KEY` 
- `APIFY_API_TOKEN`
- `HUNTER_API_KEY`
- `OPENAI_API_KEY`
- `FROM_EMAIL`
- `FROM_NAME`

## 📈 Performance Tips

1. **Rate Limiting**:
   - Hunter.io: 1 request/second
   - SendGrid: 100 emails/second
   - Apify: Varies by plan

2. **Batch Operations**:
   - Enrich emails in batches of 10
   - Send emails with delays (350ms)
   - Use pagination for large datasets

3. **Monitoring**:
   - Check API credits regularly
   - Monitor error rates
   - Track email delivery rates

## 🤝 Contributing

### Before Making Changes
1. Test current functionality
2. Check existing issues/PRs
3. Plan your changes

### Making Changes
1. Follow the `.cursorrules` guidelines
2. Add proper error handling
3. Test your changes
4. Update documentation

### After Changes
1. Test all affected features
2. Update this guide if needed
3. Create PR with clear description

## 🎯 Future Improvements

### High Priority
- [ ] Email sequence automation
- [ ] Instagram DM automation
- [ ] Lead scoring system
- [ ] Analytics dashboard

### Medium Priority
- [ ] Multi-language support
- [ ] Advanced filtering
- [ ] CRM integrations
- [ ] Mobile dashboard

### Low Priority
- [ ] AI-powered personalization
- [ ] Advanced analytics
- [ ] White-label solution
- [ ] API for external access

## 📞 Support

- **Issues**: Create GitHub issue
- **Questions**: Ask in Cursor with `/`
- **Emergency**: Check logs and restart services

---

**Happy coding! 🚀** 