#!/bin/bash

echo "🚀 HandyLabs Growth Agent Setup"
echo "==============================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOL
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=handyhasan@handylabs.live
FROM_NAME=Handy Hasan - HandyLabs

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Airtable Configuration
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_base_id_here
AIRTABLE_TABLE_NAME=Leads

# Apify Configuration (for Instagram scraping)
APIFY_API_TOKEN=your_apify_token_here

# Instagram Account (for reference)
INSTAGRAM_USERNAME=handylabs.live

# Server Configuration
PORT=3000
NODE_ENV=development
EOL
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and add your API keys!"
else
    echo "✅ .env file already exists"
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file and add your API keys"
echo "2. Set up your Airtable base with the schema from README.md"
echo "3. Run 'npm run dev' to start the growth agent"
echo "4. Run 'npm run dashboard' in another terminal to start the web UI"
echo ""
echo "Happy growing! 🌱" 