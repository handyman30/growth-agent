import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

async function testSendGrid() {
  console.log('🧪 Testing SendGrid Configuration...\n');
  
  // Check environment variables
  console.log('1️⃣ Checking environment variables:');
  console.log(`   - API Key: ${process.env.SENDGRID_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   - From Email: ${process.env.FROM_EMAIL || '❌ Missing'}`);
  console.log(`   - From Name: ${process.env.FROM_NAME || 'Not set (optional)'}\n`);
  
  if (!process.env.SENDGRID_API_KEY || !process.env.FROM_EMAIL) {
    console.error('❌ Missing required environment variables!');
    return;
  }
  
  // Configure SendGrid
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  // Send test email
  console.log('2️⃣ Sending test email...');
  const msg = {
    to: process.env.FROM_EMAIL, // Send to yourself
    from: {
      email: process.env.FROM_EMAIL,
      name: process.env.FROM_NAME || 'HandyLabs Test',
    },
    subject: 'SendGrid Test Email - HandyLabs Growth Agent',
    text: 'This is a test email from your HandyLabs Growth Agent.',
    html: `
      <h2>SendGrid Test Successful! 🎉</h2>
      <p>This is a test email from your HandyLabs Growth Agent.</p>
      <p>If you're seeing this, your SendGrid integration is working correctly.</p>
      <hr>
      <p><small>Sent at: ${new Date().toISOString()}</small></p>
    `,
  };
  
  try {
    const [response] = await sgMail.send(msg);
    console.log(`✅ Email sent successfully!`);
    console.log(`   - Status: ${response.statusCode}`);
    console.log(`   - Message ID: ${response.headers['x-message-id']}`);
    console.log(`   - Check your inbox at: ${process.env.FROM_EMAIL}\n`);
    
    console.log('3️⃣ What to check in SendGrid:');
    console.log('   1. Go to https://app.sendgrid.com/email_activity');
    console.log('   2. You should see this test email in the activity feed');
    console.log('   3. Check the "Sent" counter on your dashboard\n');
    
    console.log('✅ SendGrid is configured correctly!');
  } catch (error: any) {
    console.error('\n❌ Failed to send test email:');
    console.error(`   Error: ${error.message}`);
    
    if (error.response?.body?.errors) {
      console.error('\n   SendGrid Errors:');
      error.response.body.errors.forEach((err: any) => {
        console.error(`   - ${err.message}`);
      });
    }
    
    if (error.message?.includes('The from address does not match')) {
      console.error(`
⚠️  IMPORTANT: Sender Authentication Required!

Your email "${process.env.FROM_EMAIL}" needs to be verified in SendGrid.

To fix this:
1. Log into SendGrid: https://app.sendgrid.com
2. Go to Settings → Sender Authentication
3. Add and verify "${process.env.FROM_EMAIL}"
4. Check your email for the verification link
5. Run this test again
`);
    }
    
    if (error.code === 401) {
      console.error(`
⚠️  Authentication Error!

Your SendGrid API key appears to be invalid.

To fix this:
1. Log into SendGrid: https://app.sendgrid.com
2. Go to Settings → API Keys
3. Create a new API key with "Mail Send" permissions
4. Update your .env file with the new key
5. Run this test again
`);
    }
  }
}

// Run the test
testSendGrid().catch(console.error); 