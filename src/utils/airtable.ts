import Airtable from 'airtable';
import dotenv from 'dotenv';
import { Lead } from '../types/index.js';

dotenv.config();

// Configure Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID!
);

const table = base(process.env.AIRTABLE_TABLE_NAME || 'Leads');

export async function saveLeadsToAirtable(leads: Lead[]): Promise<void> {
  console.log(`💾 Saving ${leads.length} leads to Airtable...`);
  
  if (leads.length === 0) {
    console.log('✅ No leads to save');
    return;
  }
  
  try {
    // Check for existing leads to avoid duplicates
    const existingRecords = await table.select({
      fields: ['Instagram Handle', 'Email'],
    }).all();
    
    const existingHandles = new Set(
      existingRecords.map(record => record.get('Instagram Handle') as string)
    );
    const existingEmails = new Set(
      existingRecords.map(record => record.get('Email') as string).filter(Boolean)
    );
    
    // Filter out duplicates
    const newLeads = leads.filter(lead => {
      const isDuplicateHandle = lead.instagramHandle && existingHandles.has(lead.instagramHandle);
      const isDuplicateEmail = lead.email && existingEmails.has(lead.email);
      return !isDuplicateHandle && !isDuplicateEmail;
    });
    
    if (newLeads.length === 0) {
      console.log('✅ No new leads to save (all duplicates)');
      return;
    }
    
    // Save leads one by one to handle partial failures
    let savedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    
    for (const lead of newLeads) {
      try {
        await table.create({
          'Business Name': lead.businessName,
          'Owner Name': lead.ownerName || '',
          'Email': lead.email || '',
          'Phone': lead.phone || '',
          'Instagram Handle': lead.instagramHandle || '',
          'Website': lead.website || '',
          'Address': lead.address || '',
          'Bio': lead.bio || '',
          'Description': lead.description || '',
          'Follower Count': lead.followerCount || 0,
          'Rating': lead.rating || 0,
          'Review Count': lead.reviewCount || 0,
          'Category': lead.category,
          'City': lead.city || 'melbourne',
          'Location': lead.location,
          'Status': lead.status,
          'Source': lead.source,
          'Recent Posts': JSON.stringify(lead.recentPosts || []),
          'Business Hours': lead.businessHours ? JSON.stringify(lead.businessHours) : '',
          // Don't set Created At - it's a system field that Airtable manages automatically
          // Only set Last Contacted At if it exists
          ...(lead.lastContactedAt && { 'Last Contacted At': lead.lastContactedAt.toISOString() }),
        });
        savedCount++;
      } catch (error: any) {
        failedCount++;
        const errorMsg = `Failed to save ${lead.businessName}: ${error.message}`;
        errors.push(errorMsg);
        console.warn(`⚠️ ${errorMsg}`);
      }
    }
    
    // Log error summary to a file for dashboard display
    if (errors.length > 0) {
      const fs = await import('fs/promises');
      const errorLog = {
        timestamp: new Date().toISOString(),
        savedCount,
        failedCount,
        errors: errors.slice(0, 10), // Keep last 10 errors
        suggestion: 'Check Airtable field configurations'
      };
      
      try {
        await fs.writeFile('error-log.json', JSON.stringify(errorLog, null, 2));
      } catch (e) {
        console.error('Could not write error log:', e);
      }
    }
    
    console.log(`✅ Successfully saved ${savedCount} leads${failedCount > 0 ? `, ${failedCount} failed` : ''}`);
  } catch (error) {
    console.error('❌ Error connecting to Airtable:', error);
    throw error;
  }
}

export async function getLeadsForOutreach(limit: number = 50): Promise<Lead[]> {
  console.log(`📋 Fetching leads for outreach...`);
  
  try {
    const records = await table.select({
      filterByFormula: "AND(Status = 'new', OR(Email != '', {Instagram Handle} != ''))",
      maxRecords: limit,
    }).all();
    
    return records.map(record => ({
      id: record.id,
      businessName: record.get('Business Name') as string,
      ownerName: record.get('Owner Name') as string,
      email: record.get('Email') as string,
      phone: record.get('Phone') as string,
      instagramHandle: record.get('Instagram Handle') as string,
      website: record.get('Website') as string,
      address: record.get('Address') as string,
      bio: record.get('Bio') as string,
      description: record.get('Description') as string,
      followerCount: record.get('Follower Count') as number,
      rating: record.get('Rating') as number,
      reviewCount: record.get('Review Count') as number,
      category: record.get('Category') as string,
      city: record.get('City') as string,
      location: record.get('Location') as string,
      status: record.get('Status') as Lead['status'],
      source: record.get('Source') as Lead['source'],
      recentPosts: record.get('Recent Posts') ? JSON.parse(record.get('Recent Posts') as string) : [],
      businessHours: record.get('Business Hours') ? JSON.parse(record.get('Business Hours') as string) : undefined,
      createdAt: record.get('Created At') ? new Date(record.get('Created At') as string) : new Date(),
      updatedAt: new Date(),
    }));
  } catch (error) {
    console.error('❌ Error fetching from Airtable:', error);
    return [];
  }
}

export async function updateLeadStatus(
  leadId: string,
  status: Lead['status'],
  notes?: string
): Promise<void> {
  try {
    await table.update(leadId, {
      'Status': status,
      ...(notes && { 'Notes': notes }),
      'Last Contacted At': new Date().toISOString(),
    });
    console.log(`✅ Updated lead ${leadId} status to ${status}`);
  } catch (error) {
    console.error(`❌ Error updating lead ${leadId}:`, error);
  }
} 