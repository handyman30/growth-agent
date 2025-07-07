import dotenv from 'dotenv';
import { Lead } from '../types/index.js';
import { updateLeadStatus } from './airtable.js';

dotenv.config();

const HUNTER_API_KEY = process.env.HUNTER_API_KEY;
const HUNTER_API_URL = 'https://api.hunter.io/v2';

interface HunterEmailResult {
  email: string;
  value: string;
  type: string;
  confidence: number;
  sources: any[];
  first_name: string;
  last_name: string;
  position: string;
  department: string;
}

interface HunterDomainSearchResult {
  data: {
    domain: string;
    emails: HunterEmailResult[];
    pattern: string;
    organization: string;
  };
  meta: {
    results: number;
    limit: number;
    offset: number;
    params: any;
  };
}

/**
 * Extract domain from website URL
 */
function extractDomain(website: string | undefined): string | null {
  if (!website) return null;
  
  try {
    // Add protocol if missing
    let url = website;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    console.error(`Failed to extract domain from ${website}:`, error);
    return null;
  }
}

/**
 * Find email using Hunter.io domain search
 */
export async function findEmailWithHunter(
  domain: string,
  companyName?: string
): Promise<{ email: string; confidence: number } | null> {
  if (!HUNTER_API_KEY) {
    console.error('❌ Hunter.io API key not configured');
    return null;
  }
  
  try {
    console.log(`🔍 Searching for emails at ${domain}...`);
    
    const response = await fetch(
      `${HUNTER_API_URL}/domain-search?domain=${domain}&api_key=${HUNTER_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      console.error(`❌ Hunter.io API error:`, error);
      return null;
    }
    
    const result: HunterDomainSearchResult = await response.json();
    
    if (result.data.emails.length === 0) {
      console.log(`❌ No emails found for ${domain}`);
      return null;
    }
    
    // Sort by confidence and prefer generic emails (info@, contact@, etc.)
    const sortedEmails = result.data.emails.sort((a, b) => {
      // Prioritize generic emails
      const genericPatterns = ['info@', 'contact@', 'hello@', 'enquiries@', 'admin@'];
      const aIsGeneric = genericPatterns.some(p => a.value.startsWith(p));
      const bIsGeneric = genericPatterns.some(p => b.value.startsWith(p));
      
      if (aIsGeneric && !bIsGeneric) return -1;
      if (!aIsGeneric && bIsGeneric) return 1;
      
      // Then sort by confidence
      return b.confidence - a.confidence;
    });
    
    const bestEmail = sortedEmails[0];
    console.log(`✅ Found email: ${bestEmail.value} (confidence: ${bestEmail.confidence}%)`);
    
    return {
      email: bestEmail.value,
      confidence: bestEmail.confidence,
    };
  } catch (error) {
    console.error(`❌ Error calling Hunter.io API:`, error);
    return null;
  }
}

/**
 * Simple website scraper for emails
 */
export async function scrapeWebsiteForEmail(website: string): Promise<string | null> {
  if (!website) return null;
  
  try {
    console.log(`🌐 Scraping ${website} for emails...`);
    
    // Add protocol if missing
    let url = website;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      console.log(`❌ Failed to fetch ${website}`);
      return null;
    }
    
    const html = await response.text();
    
    // Email regex pattern
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const emails = html.match(emailRegex) || [];
    
    // Filter out common false positives
    const validEmails = emails.filter(email => {
      const lower = email.toLowerCase();
      return !lower.includes('example.com') && 
             !lower.includes('@2x') && 
             !lower.includes('.png') &&
             !lower.includes('.jpg');
    });
    
    if (validEmails.length > 0) {
      // Prefer generic emails
      const genericEmail = validEmails.find(email => {
        const lower = email.toLowerCase();
        return lower.startsWith('info@') || 
               lower.startsWith('contact@') || 
               lower.startsWith('hello@') ||
               lower.startsWith('enquiries@');
      });
      
      const selectedEmail = genericEmail || validEmails[0];
      console.log(`✅ Found email on website: ${selectedEmail}`);
      return selectedEmail;
    }
    
    console.log(`❌ No emails found on ${website}`);
    return null;
  } catch (error) {
    console.error(`❌ Error scraping website:`, error);
    return null;
  }
}

/**
 * Enrich a lead with email
 */
export async function enrichLeadWithEmail(lead: Lead): Promise<string | null> {
  // Skip if already has email
  if (lead.email) {
    console.log(`✓ ${lead.businessName} already has email: ${lead.email}`);
    return lead.email;
  }
  
  console.log(`\n🎯 Enriching ${lead.businessName}...`);
  
  // Extract domain from website
  const domain = extractDomain(lead.website);
  
  if (domain) {
    // Try Hunter.io first
    const hunterResult = await findEmailWithHunter(domain, lead.businessName);
    if (hunterResult && hunterResult.confidence >= 50) {
      return hunterResult.email;
    }
    
    // Fallback to website scraping
    if (lead.website) {
      const scrapedEmail = await scrapeWebsiteForEmail(lead.website);
      if (scrapedEmail) {
        return scrapedEmail;
      }
    }
  }
  
  console.log(`❌ No email found for ${lead.businessName}`);
  return null;
}

/**
 * Check Hunter.io account status
 */
export async function checkHunterCredits(): Promise<{ available: number; used: number } | null> {
  if (!HUNTER_API_KEY) {
    return null;
  }
  
  try {
    const response = await fetch(
      `${HUNTER_API_URL}/account?api_key=${HUNTER_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    const result = await response.json();
    
    if (result.data) {
      return {
        available: result.data.requests.searches.available,
        used: result.data.requests.searches.used,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error checking Hunter credits:', error);
    return null;
  }
} 