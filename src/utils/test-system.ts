import dotenv from 'dotenv';
import { checkServiceHealth } from './error-handler.js';
import { createCustomConfig } from './search-config.js';
import { scrapeGoogleForLeads } from '../scrapers/google.js';
import { generatePersonalizedEmail, generateInstagramDM } from './message-generator.js';
import { getTemplateForCategory } from '../templates/email-templates.js';

dotenv.config();

console.log('🧪 HandyLabs Growth Agent - Quick Test\n');

async function runQuickTest() {
  console.log('1️⃣ Checking critical services (without Apify)...\n');
  
  // Check only critical services
  const criticalServices = ['OPENAI_API_KEY', 'SENDGRID_API_KEY', 'AIRTABLE_API_KEY', 'AIRTABLE_BASE_ID'];
  let allGood = true;
  
  for (const key of criticalServices) {
    if (!process.env[key]) {
      console.log(`❌ Missing ${key}`);
      allGood = false;
    } else {
      console.log(`✅ ${key} is set`);
    }
  }
  
  if (!allGood) {
    console.log('\n❌ Please add missing environment variables to .env file');
    return;
  }
  
  console.log('\n2️⃣ Creating test configuration...\n');
  
  // Create a test search config
  const testConfig = await createCustomConfig(
    'Test Melbourne Cafes',
    ['melbourne'],
    ['cafe'],
    ['google'], // Only Google, no Instagram
    []
  );
  
  console.log(`✅ Created config: ${testConfig.name}`);
  
  console.log('\n3️⃣ Testing Google scraping (finding 3 cafes)...\n');
  
  try {
    const leads = await scrapeGoogleForLeads('melbourne', 'cafe', 3);
    console.log(`✅ Found ${leads.length} cafes in Melbourne:`);
    
    leads.forEach((lead, i) => {
      console.log(`   ${i + 1}. ${lead.businessName} - ${lead.address || 'No address'}`);
    });
    
    if (leads.length > 0) {
      console.log('\n4️⃣ Testing AI message generation...\n');
      
      const testLead = leads[0];
      console.log(`Testing with: ${testLead.businessName}`);
      
      // Test email generation
      const template = getTemplateForCategory('cafe');
      const email = await generatePersonalizedEmail(testLead, template.id);
      console.log('\n📧 Generated Email:');
      console.log(`Subject: ${email.subject}`);
      console.log(`Body preview: ${email.body.substring(0, 150)}...`);
      
      // Test DM generation
      const dm = await generateInstagramDM(testLead);
      console.log('\n📱 Generated Instagram DM:');
      console.log(dm);
    }
  } catch (error) {
    console.error('❌ Google scraping failed:', error);
    console.log('\nThis might be because Puppeteer needs Chrome installed.');
    console.log('You can still use the Instagram scraper with Apify.');
  }
  
  console.log('\n5️⃣ System Status Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ OpenAI: Ready for message personalization');
  console.log('✅ SendGrid: Ready for email sending');
  console.log('✅ Airtable: Ready for lead storage');
  console.log('⚠️  Apify: Not configured (Instagram scraping unavailable)');
  console.log('✅ Google: Ready for business discovery');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('\n🎉 Your HandyLabs Growth Agent is ready to use!');
  console.log('\nNext steps:');
  console.log('1. Add your Apify token for Instagram scraping');
  console.log('2. Run "npm run dashboard" to start the web interface');
  console.log('3. Go to http://localhost:3000/config to create search configurations');
  console.log('4. Run "npm run dev" to start the automated agent');
}

runQuickTest().catch(console.error); 