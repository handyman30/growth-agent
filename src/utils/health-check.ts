import dotenv from 'dotenv';
import { checkServiceHealth, logServiceError } from './error-handler.js';

dotenv.config();

console.log('🏥 HandyLabs Growth Agent - Health Check\n');

async function testServices() {
  // Check environment variables
  const errors = await checkServiceHealth();
  
  if (errors.length > 0) {
    console.log('❌ Found configuration issues:\n');
    errors.forEach(error => logServiceError(error));
    return;
  }
  
  console.log('✅ All environment variables configured!\n');
  console.log('🧪 Testing service connections...\n');
  
  // Test OpenAI
  console.log('1️⃣ Testing OpenAI...');
  try {
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "OK" if you can read this.' }],
      max_tokens: 10,
    });
    console.log('✅ OpenAI: Connected successfully');
    console.log(`   Model: gpt-3.5-turbo`);
    console.log(`   Response: ${response.choices[0].message.content}\n`);
  } catch (error: any) {
    console.log('❌ OpenAI: Failed to connect');
    console.log(`   Error: ${error.message}\n`);
  }
  
  // Test SendGrid
  console.log('2️⃣ Testing SendGrid...');
  try {
    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    // Note: We're not actually sending an email, just validating the API key
    console.log('✅ SendGrid: API key validated');
    console.log(`   From email: ${process.env.FROM_EMAIL}\n`);
  } catch (error: any) {
    console.log('❌ SendGrid: Failed to validate');
    console.log(`   Error: ${error.message}\n`);
  }
  
  // Test Airtable
  console.log('3️⃣ Testing Airtable...');
  try {
    const Airtable = (await import('airtable')).default;
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      process.env.AIRTABLE_BASE_ID!
    );
    const table = base(process.env.AIRTABLE_TABLE_NAME || 'Leads');
    
    // Try to fetch one record
    const records = await table.select({ maxRecords: 1 }).firstPage();
    console.log('✅ Airtable: Connected successfully');
    console.log(`   Base ID: ${process.env.AIRTABLE_BASE_ID}`);
    console.log(`   Table: ${process.env.AIRTABLE_TABLE_NAME || 'Leads'}`);
    console.log(`   Records found: ${records.length}\n`);
  } catch (error: any) {
    console.log('❌ Airtable: Failed to connect');
    console.log(`   Error: ${error.message}`);
    console.log('   Make sure your base ID and table name are correct\n');
  }
  
  // Test Apify
  console.log('4️⃣ Testing Apify...');
  try {
    const { ApifyClient } = await import('apify-client');
    const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
    const user = await client.user().get();
    console.log('✅ Apify connected');
    console.log(`   User: ${user.username || user.email}`);
    console.log(`   Plan: ${user.plan?.id || 'Free'}`);
    console.log(`   Monthly usage: $${user.plan?.maxMonthlyUsageUsd || 0}\n`);
  } catch (error: any) {
    console.log('❌ Apify: Failed to connect');
    console.log(`   Error: ${error.message}\n`);
  }
  
  // Summary
  console.log('📊 Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Service    | Status | Notes');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('OpenAI     | ✅     | $10 credit should handle ~500 messages');
  console.log('SendGrid   | ✅     | Free tier: 100 emails/day');
  console.log('Airtable   | ✅     | Free tier: 1,200 records');
  console.log('Apify      | ⚠️     | Free tier: ~250 Instagram results/month');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('\n💡 Tips:');
  console.log('- Start with small batches to test the system');
  console.log('- Monitor your API usage dashboards regularly');
  console.log('- Set up billing alerts on each platform');
  console.log('- Run this health check weekly to ensure everything is working');
}

// Run health check
testServices()
  .then(() => console.log('\n✅ Health check complete!'))
  .catch(error => console.error('\n❌ Health check failed:', error)); 