#!/bin/bash

echo "🚀 Setting up HandyLabs Growth Agent repository..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Initializing Git repository${NC}"
git init

echo -e "${YELLOW}Step 2: Adding all files${NC}"
git add .

echo -e "${YELLOW}Step 3: Creating initial commit${NC}"
git commit -m "Initial commit: HandyLabs Growth Agent v1.0

- Instagram scraping with Apify
- Google Maps scraping with Puppeteer
- AI-powered email generation
- Real-time dashboard
- Multi-city support
- Airtable integration"

echo -e "${GREEN}✅ Local repository created!${NC}"
echo ""
echo "Next steps:"
echo "1. Create a new repository on GitHub:"
echo "   https://github.com/new"
echo ""
echo "2. Add the remote origin:"
echo "   git remote add origin https://github.com/yourusername/handylabs-growth-agent.git"
echo ""
echo "3. Push to GitHub:"
echo "   git push -u origin main"
echo ""
echo "4. Deploy to Railway:"
echo "   railway login"
echo "   railway init"
echo "   railway link"
echo "   railway up"
echo ""
echo -e "${GREEN}Ready to deploy! 🎉${NC}" 