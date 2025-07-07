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
      fields: ['Business Name', 'Instagram Handle', 'Email', 'Phone', 'Address', 'Source'],
    }).all();
    
    // Create sets for duplicate checking
    const existingIdentifiers = new Set<string>();
    
    existingRecords.forEach(record => {
      const businessName = record.get('Business Name') as string;
      const instagramHandle = record.get('Instagram Handle') as string;
      const email = record.get('Email') as string;
      const phone = record.get('Phone') as string;
      const address = record.get('Address') as string;
      const source = record.get('Source') as string;
      
      // Add various identifiers for duplicate checking
      if (instagramHandle) {
        existingIdentifiers.add(`ig:${instagramHandle}`);
      }
      if (email) {
        existingIdentifiers.add(`email:${email.toLowerCase()}`);
      }
      if (businessName && address) {
        existingIdentifiers.add(`business:${businessName.toLowerCase()}-${address.toLowerCase()}`);
      }
      if (businessName && phone) {
        existingIdentifiers.add(`phone:${businessName.toLowerCase()}-${phone}`);
      }
    });
    
    // Filter out duplicates
    const newLeads = leads.filter(lead => {
      // Check Instagram handle
      if (lead.instagramHandle && existingIdentifiers.has(`ig:${lead.instagramHandle}`)) {
        console.log(`⏭️ Skipping duplicate: @${lead.instagramHandle}`);
        return false;
      }
      
      // Check email
      if (lead.email && existingIdentifiers.has(`email:${lead.email.toLowerCase()}`)) {
        console.log(`⏭️ Skipping duplicate email: ${lead.email}`);
        return false;
      }
      
      // Check business name + address (for Google Maps)
      if (lead.businessName && lead.address) {
        const businessKey = `business:${lead.businessName.toLowerCase()}-${lead.address.toLowerCase()}`;
        if (existingIdentifiers.has(businessKey)) {
          console.log(`⏭️ Skipping duplicate business: ${lead.businessName} at ${lead.address}`);
          return false;
        }
      }
      
      // Check business name + phone
      if (lead.businessName && lead.phone) {
        const phoneKey = `phone:${lead.businessName.toLowerCase()}-${lead.phone}`;
        if (existingIdentifiers.has(phoneKey)) {
          console.log(`⏭️ Skipping duplicate: ${lead.businessName} with phone ${lead.phone}`);
          return false;
        }
      }
      
      return true;
    });
    
    if (newLeads.length === 0) {
      console.log('✅ No new leads to save (all duplicates)');
      console.log(`📊 Skipped ${leads.length} duplicate leads`);
      return;
    }
    
    console.log(`📊 Found ${newLeads.length} new leads out of ${leads.length} total (${leads.length - newLeads.length} duplicates)`);
    
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
      sort: [{field: 'Created At', direction: 'desc'}]
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

export async function getAllLeads(limit: number = 1000): Promise<Lead[]> {
  console.log(`📋 Fetching all leads...`);
  
  try {
    const records = await table.select({
      maxRecords: limit,
      sort: [{field: 'Created At', direction: 'desc'}]
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
    const updateData: any = {
      'Status': status,
      ...(notes && { 'Notes': notes }),
    };
    
    // Only update Last Contacted At if the status is 'contacted'
    if (status === 'contacted') {
      // Airtable expects ISO string format
      updateData['Last Contacted At'] = new Date().toISOString();
    }
    
    await table.update(leadId, updateData);
    console.log(`✅ Updated lead ${leadId} status to ${status}`);
  } catch (error) {
    console.error(`❌ Error updating lead ${leadId}:`, error);
    // Don't throw, just log the error
  }
}

export async function updateLeadEmail(
  leadId: string,
  email: string
): Promise<void> {
  try {
    await table.update(leadId, {
      'Email': email,
      'Notes': 'Email enriched via Hunter.io',
    });
    console.log(`✅ Updated lead ${leadId} with email: ${email}`);
  } catch (error) {
    console.error(`❌ Error updating lead ${leadId} with email:`, error);
  }
} 