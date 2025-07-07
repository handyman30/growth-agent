import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
import { Lead, OutreachMessage } from '../types/index.js';
import { generatePersonalizedEmail } from '../utils/message-generator.js';
import { updateLeadStatus, getLeadsForOutreach } from '../utils/airtable.js';
import { handleAPIError, logServiceError } from '../utils/error-handler.js';

dotenv.config();

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendEmail(
  lead: Lead,
  templateId: string
): Promise<OutreachMessage> {
  try {
    // Validate environment variables
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY is not configured');
    }
    if (!process.env.FROM_EMAIL) {
      throw new Error('FROM_EMAIL is not configured');
    }
    
    // Generate personalized email
    const { subject, body } = await generatePersonalizedEmail(lead, templateId);
    
    // Create message
    const msg = {
      to: lead.email!,
      from: {
        email: process.env.FROM_EMAIL!,
        name: process.env.FROM_NAME || 'Handy Hasan - HandyLabs',
      },
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true },
        subscriptionTracking: { enable: false },
      },
    };

    console.log(`📧 Attempting to send email to ${lead.email} from ${process.env.FROM_EMAIL}`);
    
    // Send email
    const [response] = await sgMail.send(msg);
    
    console.log(`✅ SendGrid Response:`, {
      statusCode: response.statusCode,
      headers: response.headers,
      body: response.body
    });
    
    // Only consider it sent if we get a 202 status
    if (response.statusCode === 202) {
      console.log(`✅ Email successfully queued for ${lead.businessName} (${lead.email})`);
      
      // Update lead status
      if (lead.id) {
        try {
          await updateLeadStatus(lead.id, 'contacted', `Email sent with template: ${templateId}`);
        } catch (statusError) {
          console.error('⚠️  Failed to update lead status:', statusError);
        }
      }
      
      return {
        leadId: lead.id!,
        type: 'email',
        subject,
        content: body,
        status: 'sent',
        sentAt: new Date(),
      };
    } else {
      console.error(`❌ Unexpected SendGrid response:`, response.statusCode);
      throw new Error(`SendGrid returned status ${response.statusCode}`);
    }
  } catch (error: any) {
    console.error(`❌ Email failed for ${lead.businessName}:`, {
      message: error.message,
      code: error.code,
      response: error.response?.body || error.response
    });
    
    // Check for specific SendGrid errors
    if (error.response?.body?.errors) {
      console.error('SendGrid errors:', error.response.body.errors);
    }
    
    // Common issues
    if (error.message?.includes('The from address does not match a verified Sender')) {
      console.error(`
⚠️  IMPORTANT: Your sender email "${process.env.FROM_EMAIL}" is not verified in SendGrid!
Please:
1. Log into SendGrid
2. Go to Settings > Sender Authentication
3. Verify the email address "${process.env.FROM_EMAIL}"
`);
    }
    
    const serviceError = handleAPIError(error, 'SendGrid');
    logServiceError(serviceError);
    
    // Re-throw if critical
    if (serviceError.critical) {
      throw error;
    }
    
    // For non-critical (like rate limits), return failed message
    return {
      leadId: lead.id!,
      type: 'email',
      subject: '',
      content: '',
      status: 'failed',
      sentAt: new Date(),
    };
  }
}

export async function sendBulkEmails(
  templateId: string,
  limit: number = 25
): Promise<{ sent: number; failed: number; limitReached: boolean }> {
  console.log(`📧 Starting bulk email campaign with template: ${templateId}`);
  
  // Get leads to contact
  let leads: Lead[] = [];
  try {
    leads = await getLeadsForOutreach(limit);
  } catch (error: any) {
    const serviceError = handleAPIError(error, 'Airtable');
    logServiceError(serviceError);
    return { sent: 0, failed: 0, limitReached: false };
  }
  
  const emailLeads = leads.filter(lead => lead.email);
  
  console.log(`Found ${emailLeads.length} leads with email addresses`);
  
  let sent = 0;
  let failed = 0;
  let limitReached = false;
  
  for (const lead of emailLeads) {
    try {
      const result = await sendEmail(lead, templateId);
      if (result.status === 'sent') {
        sent++;
      } else {
        failed++;
      }
      
      // Add delay to avoid rate limiting (3 emails per second max)
      await new Promise(resolve => setTimeout(resolve, 350));
    } catch (error: any) {
      failed++;
      
      // Check if we hit the daily limit
      if (error.code === 429 || error.message?.includes('limit')) {
        limitReached = true;
        console.log('📧 Daily email limit reached. Will resume tomorrow.');
        break;
      }
    }
  }
  
  console.log(`✅ Campaign complete: ${sent} sent, ${failed} failed`);
  return { sent, failed, limitReached };
}

// Email tracking webhook handler
export async function handleEmailWebhook(events: any[]): Promise<void> {
  for (const event of events) {
    console.log(`📊 Email event: ${event.event} for ${event.email}`);
    
    // Handle different event types
    switch (event.event) {
      case 'open':
        // Track email opens
        console.log(`Email opened by ${event.email}`);
        break;
        
      case 'click':
        // Track link clicks
        console.log(`Link clicked by ${event.email}: ${event.url}`);
        break;
        
      case 'bounce':
      case 'dropped':
        // Handle failures
        console.log(`Email failed for ${event.email}: ${event.reason}`);
        break;
    }
  }
}

// Schedule daily email campaign
export async function runDailyEmailCampaign(): Promise<void> {
  console.log('🚀 Running daily email campaign...');
  
  let totalSent = 0;
  let totalFailed = 0;
  
  // Send to cafes
  const cafeResults = await sendBulkEmails('cafe-initial', 10);
  totalSent += cafeResults.sent;
  totalFailed += cafeResults.failed;
  
  if (!cafeResults.limitReached) {
    // Send to SMBs
    const smbResults = await sendBulkEmails('smb-initial', 10);
    totalSent += smbResults.sent;
    totalFailed += smbResults.failed;
    
    if (!smbResults.limitReached) {
      // Send to influencers
      const influencerResults = await sendBulkEmails('influencer-initial', 5);
      totalSent += influencerResults.sent;
      totalFailed += influencerResults.failed;
    }
  }
  
  console.log('📊 Daily campaign summary:');
  console.log(`- Total sent: ${totalSent}`);
  console.log(`- Total failed: ${totalFailed}`);
  
  if (totalSent === 0 && totalFailed > 0) {
    console.log('⚠️  No emails sent. Check your SendGrid credits and API key.');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDailyEmailCampaign()
    .then(() => console.log('✅ Email campaign completed'))
    .catch(error => console.error('❌ Campaign failed:', error));
} 