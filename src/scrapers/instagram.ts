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

// Melbourne business hashtags - expanded for more diversity
const MELBOURNE_HASHTAGS = [
  // Food & Beverage
  'melbournecafe',
  'melbournecoffee',
  'melbournefoodie',
  'melbournerestaurant',
  'melbourneeats',
  'melbournebar',
  'melbournepizza',
  'melbournebrunch',
  
  // Retail & Fashion
  'melbourneboutique',
  'melbournefashion',
  'melbourneshopping',
  'melbourneretail',
  'melbournestore',
  
  // Health & Wellness
  'melbournefitness',
  'melbournewellness',
  'melbourneyoga',
  'melbournegym',
  'melbournehealth',
  'melbournebeauty',
  'melbournesalon',
  'melbournespa',
  'melbournehaircut',
  'melbournetattoo',
  'melbournepiercing',
  'melbournenails',
  'melbournemassage',
  'melbournephysio',
  'melbournedental',
  
  // Business & Services
  'melbournebusiness',
  'melbournesmallbusiness',
  'melbourneentrepreneur',
  'melbournestartup',
  'melbourneservices',
  'melbournephotographer',
  'melbournedesign',
  'melbourneplumber',
  'melbourneelectrician',
  'melbournecarpenter',
  'melbournecleaner',
  'melbourneaccountant',
  'melbournelawyer',
  'melbourneconsultant',
  
  // General Melbourne
  'melbourne',
  'melbournelife',
  'melbournecity',
  'visitmelbourne',
];

// Keywords to identify businesses vs personal accounts - expanded
const BUSINESS_KEYWORDS = [
  // Food & Beverage
  'cafe', 'coffee', 'restaurant', 'bar', 'pub', 'bistro', 'eatery',
  'bakery', 'pizza', 'burger', 'sushi', 'thai', 'italian', 'chinese',
  'brunch', 'breakfast', 'lunch', 'dinner', 'catering', 'food', 'drinks',
  
  // Retail & Shopping
  'boutique', 'shop', 'store', 'retail', 'fashion', 'clothing', 'apparel',
  'accessories', 'jewelry', 'jewellery', 'handmade', 'vintage', 'online',
  
  // Health & Wellness
  'wellness', 'fitness', 'gym', 'yoga', 'pilates', 'health', 'nutrition',
  'salon', 'spa', 'beauty', 'hair', 'haircut', 'hairdresser', 'barber',
  'nails', 'makeup', 'skincare', 'massage', 'therapy', 'clinic', 'medical', 
  'dental', 'physio', 'physiotherapy', 'tattoo', 'piercing', 'tattooist',
  
  // Professional Services
  'studio', 'photography', 'design', 'agency', 'consulting', 'services',
  'business', 'company', 'office', 'professional', 'freelance', 'creative',
  'marketing', 'digital', 'web', 'social', 'media', 'pr', 'events',
  'plumber', 'electrician', 'carpenter', 'cleaner', 'cleaning', 'accountant',
  'lawyer', 'solicitor', 'consultant', 'tradesman', 'tradesperson',
  
  // Location & Contact
  'melbourne', 'australia', 'melb', 'aus', 'location', 'based',
  'contact', 'dm', 'book', 'order', 'delivery', 'open', 'hours',
  'appointment', 'bookings', 'enquiries', 'info', 'call', 'email',
  
  // Business Indicators
  'est', 'since', 'serving', 'specialising', 'offering', 'providing',
  'available', 'now', 'new', 'opening', 'coming', 'soon'
];

export async function scrapeInstagramForLeads(
  hashtag: string,
  maxResults: number = 100
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
  const hasWebsite = bio.includes('www.') || bio.includes('.com') || bio.includes('.au') || 
                    bio.includes('.co') || bio.includes('.net') || bio.includes('.org');
  const hasEmail = bio.includes('@');
  const hasPhone = /\d{8,}/.test(bio) || /\d{4}\s?\d{4}/.test(bio); // Has phone number
  const hasEmoji = /[📍📞📧🏢🏪🏬🍴☕🍕🍔🥗💪🧘💇💅💈🎨🔧⚡🧹📊⚖️]/.test(bio); // Business emojis
  const isVerified = item.ownerIsVerified;
  const hasGoodFollowers = item.ownerFollowersCount > 500; // Lower threshold
  
  // Count positive indicators
  let score = 0;
  if (hasBusinessKeyword) score += 2;
  if (hasWebsite) score += 2;
  if (hasEmail) score += 2;
  if (hasPhone) score += 1;
  if (hasEmoji) score += 1;
  if (isVerified) score += 1;
  if (hasGoodFollowers) score += 1;
  
  // Business if score >= 2 (more flexible)
  return score >= 2;
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
  
  // Food & Beverage
  if (bioLower.includes('cafe') || bioLower.includes('coffee') || bioLower.includes('espresso')) return 'cafe';
  if (bioLower.includes('restaurant') || bioLower.includes('dining') || bioLower.includes('eatery')) return 'restaurant';
  if (bioLower.includes('bar') || bioLower.includes('pub') || bioLower.includes('cocktail')) return 'bar';
  if (bioLower.includes('bakery') || bioLower.includes('patisserie')) return 'bakery';
  if (bioLower.includes('pizza') || bioLower.includes('burger') || bioLower.includes('takeaway')) return 'fastfood';
  
  // Retail & Fashion
  if (bioLower.includes('boutique') || bioLower.includes('fashion') || bioLower.includes('clothing')) return 'boutique';
  if (bioLower.includes('jewelry') || bioLower.includes('jewellery') || bioLower.includes('accessories')) return 'jewelry';
  if (bioLower.includes('vintage') || bioLower.includes('thrift') || bioLower.includes('secondhand')) return 'vintage';
  
  // Health & Wellness
  if (bioLower.includes('fitness') || bioLower.includes('gym') || bioLower.includes('training')) return 'fitness';
  if (bioLower.includes('yoga') || bioLower.includes('pilates') || bioLower.includes('meditation')) return 'wellness';
  if (bioLower.includes('salon') || bioLower.includes('hair') || bioLower.includes('barber') || bioLower.includes('haircut') || bioLower.includes('hairdresser')) return 'haircut';
  if (bioLower.includes('beauty') || bioLower.includes('makeup') || bioLower.includes('skincare')) return 'beauty';
  if (bioLower.includes('spa') || bioLower.includes('massage') || bioLower.includes('therapy')) return 'massage';
  if (bioLower.includes('tattoo') || bioLower.includes('piercing') || bioLower.includes('tattooist')) return 'tattoo';
  if (bioLower.includes('physio') || bioLower.includes('physiotherapy') || bioLower.includes('rehabilitation')) return 'physio';
  if (bioLower.includes('dental') || bioLower.includes('dentist') || bioLower.includes('orthodontist')) return 'dental';
  
  // Professional Services
  if (bioLower.includes('photography') || bioLower.includes('photographer') || bioLower.includes('photo')) return 'photography';
  if (bioLower.includes('design') || bioLower.includes('creative') || bioLower.includes('studio')) return 'design';
  if (bioLower.includes('marketing') || bioLower.includes('digital') || bioLower.includes('agency')) return 'marketing';
  if (bioLower.includes('consulting') || bioLower.includes('consultant') || bioLower.includes('advisory')) return 'consulting';
  if (bioLower.includes('plumber') || bioLower.includes('plumbing')) return 'plumber';
  if (bioLower.includes('electrician') || bioLower.includes('electrical')) return 'electrician';
  if (bioLower.includes('carpenter') || bioLower.includes('carpentry')) return 'carpenter';
  if (bioLower.includes('cleaner') || bioLower.includes('cleaning')) return 'cleaner';
  if (bioLower.includes('accountant') || bioLower.includes('accounting') || bioLower.includes('bookkeeping')) return 'accountant';
  if (bioLower.includes('lawyer') || bioLower.includes('solicitor') || bioLower.includes('legal')) return 'lawyer';
  
  // Others
  if (bioLower.includes('influencer') || bioLower.includes('blogger') || bioLower.includes('content')) return 'influencer';
  if (bioLower.includes('service') || bioLower.includes('business')) return 'service';
  
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
      const leads = await scrapeInstagramForLeads(hashtag, 30); // 30 per hashtag
      
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

// Function to run a quick targeted scrape
export async function runTargetedInstagramScrape(
  categories: string[] = ['cafe', 'restaurant', 'boutique', 'fitness', 'beauty', 'haircut', 'tattoo', 'massage', 'physio', 'plumber', 'electrician', 'cleaner', 'accountant'],
  leadsPerCategory: number = 10
): Promise<void> {
  console.log('🚀 Starting targeted Instagram scraping...');
  console.log(`📊 Target: ${leadsPerCategory} leads per category`);
  console.log(`📊 Categories: ${categories.join(', ')}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const categoryHashtags: Record<string, string[]> = {
    cafe: ['melbournecafe', 'melbournecoffee', 'melbournebrunch'],
    restaurant: ['melbournerestaurant', 'melbourneeats', 'melbournefoodie'],
    boutique: ['melbourneboutique', 'melbournefashion', 'melbourneshopping'],
    fitness: ['melbournefitness', 'melbournegym', 'melbourneyoga'],
    beauty: ['melbournebeauty', 'melbournesalon', 'melbournespa'],
    bar: ['melbournebar', 'melbournepub', 'melbournedrinks'],
    wellness: ['melbournewellness', 'melbournehealth', 'melbourneyoga'],
    photography: ['melbournephotographer', 'melbournephotography'],
    design: ['melbournedesign', 'melbournecreative'],
    haircut: ['melbournehaircut', 'melbournebarber', 'melbournehairdresser'],
    tattoo: ['melbournetattoo', 'melbournepiercing', 'melbournetattooist'],
    massage: ['melbournemassage', 'melbournetherapy', 'melbournespa'],
    physio: ['melbournephysio', 'melbournephysiotherapy', 'melbournehealth'],
    dental: ['melbournedental', 'melbournedentist', 'melbournehealth'],
    plumber: ['melbourneplumber', 'melbournetrades', 'melbourneservices'],
    electrician: ['melbourneelectrician', 'melbournetrades', 'melbourneservices'],
    cleaner: ['melbournecleaner', 'melbournecleaning', 'melbourneservices'],
    accountant: ['melbourneaccountant', 'melbournebusiness', 'melbourneservices'],
    lawyer: ['melbournelawyer', 'melbournesolicitor', 'melbourneservices'],
  };
  
  let totalLeadsFound = 0;
  
  for (const category of categories) {
    const hashtags = categoryHashtags[category] || [`melbourne${category}`];
    console.log(`\n📍 Scraping ${category.toUpperCase()} businesses...`);
    
    let categoryLeads: Lead[] = [];
    
    for (const hashtag of hashtags) {
      if (categoryLeads.length >= leadsPerCategory) break;
      
      console.log(`   🔍 Trying #${hashtag}...`);
      
      try {
        const leads = await scrapeInstagramForLeads(hashtag, 50);
        const relevantLeads = leads.filter(lead => 
          lead.category === category || lead.category === 'other'
        );
        
        categoryLeads.push(...relevantLeads);
        console.log(`   ✅ Found ${relevantLeads.length} ${category} leads`);
        
        // Small delay between hashtags
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.log(`   ❌ Failed to scrape #${hashtag}`);
      }
    }
    
    // Take only the required number
    categoryLeads = categoryLeads.slice(0, leadsPerCategory);
    
    if (categoryLeads.length > 0) {
      console.log(`💾 Saving ${categoryLeads.length} ${category} leads...`);
      try {
        await saveLeadsToAirtable(categoryLeads);
        totalLeadsFound += categoryLeads.length;
        console.log(`✅ Saved successfully!`);
      } catch (error) {
        console.error(`⚠️ Failed to save some leads`);
      }
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Total leads found: ${totalLeadsFound}`);
  console.log('✅ Targeted scraping completed');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check if specific mode is requested
  const mode = process.argv[2];
  
  if (mode === 'targeted') {
    runTargetedInstagramScrape()
      .then(() => console.log('✅ Targeted scraping completed'))
      .catch(error => console.error('❌ Scraping failed:', error));
  } else {
    scrapeInstagramDaily()
      .then(() => console.log('✅ Daily scraping completed'))
      .catch(error => console.error('❌ Scraping failed:', error));
  }
} 