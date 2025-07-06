import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';
import { Lead, InstagramPost } from '../types/index.js';
import { saveLeadsToAirtable } from '../utils/airtable.js';
import { handleAPIError, logServiceError } from '../utils/error-handler.js';
import { getSearchConfigs } from '../utils/search-config.js';
import { logActivity, updateCronStatus } from '../utils/system-status.js';

dotenv.config();

const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

// Melbourne business hashtags
const MELBOURNE_HASHTAGS = [
  'melbournecafe',
  'melbournecoffee',
  'melbournefoodie',
  'melbournebusiness',
  'melbournesmallbusiness',
  'melbournerestaurant',
  'melbourneboutique',
  'melbournefitness',
  'melbournewellness',
  'melbourneentrepreneur',
];

// Keywords to identify businesses vs personal accounts
const BUSINESS_KEYWORDS = [
  'cafe', 'coffee', 'restaurant', 'boutique', 'studio', 'salon',
  'shop', 'store', 'wellness', 'fitness', 'yoga', 'pilates',
  'photography', 'design', 'agency', 'consulting', 'services',
  'business', 'company', 'melbourne', 'australia', 'contact',
  'dm', 'book', 'order', 'delivery', 'open', 'hours'
];

export async function scrapeInstagramForLeads(
  hashtag: string,
  maxResults: number = 50
): Promise<Lead[]> {
  console.log(`🔍 Scraping Instagram for: ${hashtag}`);
  
  try {
    // Run the Instagram Hashtag Scraper
    const run = await client.actor("apify/instagram-hashtag-scraper").call({
      hashtags: [hashtag],
      resultsLimit: maxResults,
      extendOutputFunction: `async ({ data, item, page, request, customData }) => {
        return {
          ...item,
          profileData: await page.evaluate(() => {
            // Extract additional profile data if available
            return {
              email: document.querySelector('a[href^="mailto:"]')?.textContent,
              website: document.querySelector('a[rel="me"]')?.href,
            };
          }),
        };
      }`,
    });

    // Get results from the run
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    console.log(`📊 Raw results: ${items.length} posts found`);
    
    // Filter for business accounts first
    const businessAccounts = items.filter(item => isBusinessAccount(item));
    console.log(`🏢 Business accounts: ${businessAccounts.length}`);
    
    // Convert to leads (email extraction happens in convertToLead)
    const leads: Lead[] = businessAccounts.map(item => convertToLead(item));
    
    // Filter leads that have some form of contact (email, website, or Instagram handle)
    const contactableLeads = leads.filter(lead => 
      lead.email || lead.website || lead.instagramHandle
    );
    
    console.log(`✅ Found ${contactableLeads.length} contactable business leads from ${hashtag}`);
    
    await logActivity({
      type: 'scrape',
      source: 'instagram',
      message: `Found ${contactableLeads.length} leads from #${hashtag}`,
      status: 'success',
      details: { 
        count: contactableLeads.length, 
        hashtag,
        rawCount: items.length,
        businessCount: businessAccounts.length
      }
    });
    
    return contactableLeads;
  } catch (error: any) {
    console.error(`❌ Error scraping ${hashtag}:`, error.message);
    
    await logActivity({
      type: 'error',
      source: 'instagram',
      message: `Failed to scrape #${hashtag}: ${error.message}`,
      status: 'error',
      details: { hashtag, error: error.message }
    });
    
    const serviceError = handleAPIError(error, 'Apify');
    
    // If it's a credit issue, return empty array but continue
    if (!serviceError.critical) {
      console.log(`⚠️  Continuing without Instagram data for ${hashtag}`);
      return [];
    }
    
    // If critical, throw the error
    throw error;
  }
}

function isBusinessAccount(item: any): boolean {
  const bio = item.ownerBio?.toLowerCase() || '';
  const username = item.ownerUsername?.toLowerCase() || '';
  const fullName = item.ownerFullName?.toLowerCase() || '';
  
  // More inclusive checks
  const hasBusinessKeyword = BUSINESS_KEYWORDS.some(keyword => 
    bio.includes(keyword) || username.includes(keyword) || fullName.includes(keyword)
  );
  
  // Check for business indicators
  const hasWebsite = bio.includes('www.') || bio.includes('.com') || bio.includes('.au');
  const hasEmail = bio.includes('@');
  const hasPhone = /\d{8,}/.test(bio); // Has phone number
  const isVerified = item.ownerIsVerified;
  const hasHighFollowers = item.ownerFollowersCount > 1000;
  
  // Business if has keywords OR has contact info OR is verified with good following
  return hasBusinessKeyword || hasWebsite || hasEmail || hasPhone || (isVerified && hasHighFollowers);
}

function convertToLead(item: any): Lead {
  const recentPosts: InstagramPost[] = item.posts?.slice(0, 3).map((post: any) => ({
    id: post.id,
    caption: post.caption || '',
    imageUrl: post.displayUrl,
    likeCount: post.likesCount || 0,
    commentCount: post.commentsCount || 0,
    postedAt: new Date(post.timestamp * 1000),
  })) || [];

  // Extract email from bio if present - improved regex
  const emailRegex = /([a-zA-Z0-9][a-zA-Z0-9._-]*@[a-zA-Z0-9][a-zA-Z0-9._-]*\.[a-zA-Z0-9._-]+)/gi;
  const bioEmails = item.ownerBio?.match(emailRegex) || [];
  const email = bioEmails[0] || item.email || item.ownerEmail || item.contactEmail;
  
  // Extract phone from bio
  const phoneRegex = /(\+?61|0)?[\s-]?([4-5]\d{2})[\s-]?(\d{3})[\s-]?(\d{3})|(\d{4})[\s-]?(\d{4})/g;
  const phoneMatch = item.ownerBio?.match(phoneRegex);
  
  return {
    source: 'instagram',
    businessName: item.ownerFullName || item.ownerUsername,
    ownerName: item.ownerFullName,
    email: email,
    phone: phoneMatch?.[0]?.replace(/[\s-]/g, ''),
    instagramHandle: item.ownerUsername,
    website: item.website || extractWebsiteFromBio(item.ownerBio),
    bio: item.ownerBio,
    followerCount: item.ownerFollowersCount,
    category: categorizeBusinessType(item.ownerBio || ''),
    city: 'melbourne', // Default to Melbourne for Instagram scraping
    location: 'Melbourne, Australia',
    recentPosts,
    status: 'new',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function extractWebsiteFromBio(bio: string): string | undefined {
  if (!bio) return undefined;
  
  // Look for URLs in bio
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|com\.au|net|org|co|io|live))/gi;
  const matches = bio.match(urlRegex);
  
  return matches?.[0];
}

function categorizeBusinessType(bio: string): Lead['category'] {
  const bioLower = bio?.toLowerCase() || '';
  
  if (bioLower.includes('cafe') || bioLower.includes('coffee')) return 'cafe';
  if (bioLower.includes('restaurant') || bioLower.includes('dining')) return 'restaurant';
  if (bioLower.includes('boutique') || bioLower.includes('fashion')) return 'boutique';
  if (bioLower.includes('influencer') || bioLower.includes('blogger')) return 'influencer';
  if (bioLower.includes('service') || bioLower.includes('consulting')) return 'service';
  
  return 'other';
}

export async function scrapeInstagramDaily(): Promise<void> {
  console.log('🚀 Starting daily lead scraping...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await logActivity({
    type: 'scrape',
    source: 'instagram',
    message: 'Starting Instagram scraping session',
    status: 'success'
  });
  
  await updateCronStatus('Instagram Scraper', { 
    lastRun: new Date().toISOString() 
  });
  
  const allLeads: Lead[] = [];
  let successCount = 0;
  let failCount = 0;
  let totalLeadsCount = 0;
  
  // Scrape each hashtag
  for (let i = 0; i < MELBOURNE_HASHTAGS.length; i++) {
    const hashtag = MELBOURNE_HASHTAGS[i];
    console.log(`📍 [${i + 1}/${MELBOURNE_HASHTAGS.length}] Processing #${hashtag}`);
    console.log('────────────────────────────────────────');
    
    try {
      const leads = await scrapeInstagramForLeads(hashtag, 10); // 10 per hashtag
      
      if (leads.length > 0) {
        console.log(`✅ Success! Found ${leads.length} leads`);
        console.log(`   Examples: ${leads.slice(0, 3).map(l => l.businessName).join(', ')}${leads.length > 3 ? '...' : ''}`);
        
        // Save leads immediately
        console.log(`💾 Saving ${leads.length} leads to Airtable...`);
        try {
          await saveLeadsToAirtable(leads);
          console.log(`✅ Saved successfully!`);
        } catch (error) {
          console.error(`⚠️ Failed to save some leads`);
        }
      } else {
        console.log(`✅ No leads found`);
      }
      
      allLeads.push(...leads);
      successCount++;
      totalLeadsCount += leads.length;
      console.log('');
      
      // Add delay to avoid rate limiting
      if (i < MELBOURNE_HASHTAGS.length - 1) {
        console.log('⏳ Waiting 5 seconds before next hashtag...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      failCount++;
      console.error(`❌ Failed to scrape ${hashtag}`);
      console.log('');
    }
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Scraping summary: ${successCount} successful, ${failCount} failed`);
  console.log(`📊 Total leads found: ${totalLeadsCount}`);
  
  // Remove duplicates from overall summary
  const uniqueLeads = Array.from(
    new Map(allLeads.map(lead => [lead.instagramHandle, lead])).values()
  );
  
  console.log(`📊 Total unique leads saved: ${uniqueLeads.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('✅ Scraping completed');
  
  await updateCronStatus('Instagram Scraper', { 
    status: 'active'
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeInstagramDaily()
    .then(() => console.log('✅ Scraping completed'))
    .catch(error => console.error('❌ Scraping failed:', error));
} 