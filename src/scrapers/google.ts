import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';
import { Lead, GooglePlace } from '../types/index.js';
import { saveLeadsToAirtable } from '../utils/airtable.js';
import { handleAPIError, logServiceError } from '../utils/error-handler.js';
import { logActivity, updateCronStatus } from '../utils/system-status.js';

dotenv.config();

const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

// Australian cities with their state codes for better search results
const CITY_MAPPINGS: Record<string, string> = {
  'melbourne': 'Melbourne, VIC, Australia',
  'sydney': 'Sydney, NSW, Australia',
  'adelaide': 'Adelaide, SA, Australia',
  'brisbane': 'Brisbane, QLD, Australia',
  'perth': 'Perth, WA, Australia',
  'canberra': 'Canberra, ACT, Australia',
  'hobart': 'Hobart, TAS, Australia',
  'darwin': 'Darwin, NT, Australia',
};

// Small-medium business categories (like Instagram scraper)
const SMALL_BUSINESS_CATEGORIES = {
  // Food & Beverage
  cafe: ['cafe', 'coffee shop', 'espresso bar', 'brunch cafe'],
  restaurant: ['restaurant', 'eatery', 'bistro', 'dining'],
  bar: ['bar', 'pub', 'cocktail bar', 'wine bar'],
  bakery: ['bakery', 'patisserie', 'bread shop'],
  
  // Retail & Fashion
  boutique: ['boutique', 'fashion store', 'clothing shop'],
  jewelry: ['jewelry store', 'jewellery shop', 'accessories'],
  
  // Health & Wellness
  salon: ['hair salon', 'beauty salon', 'hairdresser', 'barber'],
  spa: ['spa', 'massage', 'wellness center'],
  fitness: ['gym', 'fitness center', 'personal training'],
  
  // Professional Services (small businesses)
  photography: ['photography studio', 'photographer'],
  design: ['design studio', 'creative agency'],
  plumber: ['plumber', 'plumbing service'],
  electrician: ['electrician', 'electrical service'],
  cleaner: ['cleaning service', 'house cleaner'],
  accountant: ['accountant', 'bookkeeping service'],
  lawyer: ['lawyer', 'legal service'],
  
  // Health Services
  physio: ['physiotherapist', 'physiotherapy'],
  dental: ['dentist', 'dental clinic'],
  massage: ['massage therapist', 'massage therapy'],
  
  // Personal Services
  tattoo: ['tattoo parlor', 'tattoo studio'],
  piercing: ['piercing studio', 'body piercing'],
  nails: ['nail salon', 'nail art'],
};

export async function scrapeGoogleForLeads(
  city: string,
  category: string,
  maxResults: number = 50
): Promise<Lead[]> {
  console.log(`🔍 Searching Google Maps for ${category} in ${city}...`);
  console.log(`🎯 Targeting small-medium businesses (like Instagram scraper)`);
  console.log(`ℹ️  Note: Google Maps doesn't provide email addresses. To get emails:`);
  console.log(`    • Use Instagram scraper (emails often in bios)`);
  console.log(`    • Visit business websites manually`);
  console.log(`    • Use an email finder service\n`);
  
  try {
    const cityQuery = CITY_MAPPINGS[city.toLowerCase()] || `${city}, Australia`;
    
    // Get search terms for the category
    const categoryTerms = SMALL_BUSINESS_CATEGORIES[category as keyof typeof SMALL_BUSINESS_CATEGORIES] || [category];
    
    // Create search terms that target small businesses
    const searchTerms = categoryTerms.flatMap(term => [
      `${term} in ${cityQuery}`,
      `local ${term} in ${cityQuery}`,
      `independent ${term} in ${cityQuery}`,
      `family owned ${term} in ${cityQuery}`,
      `small ${term} in ${cityQuery}`,
    ]);
    
    // Run the Google Maps Extractor
    const run = await client.actor("compass/google-maps-extractor").call({
      searchStringsArray: searchTerms,
      locationQuery: cityQuery,
      language: 'en',
      maxCrawledPlacesPerSearch: Math.floor(maxResults / searchTerms.length),
      skipClosedPlaces: true,
      deeperCityScrape: false,
      searchMatching: 'all',
      placeMinimumStars: '',
      placeMaximumStars: '4.5', // Avoid the super popular ones
    });

    // Get results from the run
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    console.log(`📊 Raw results: ${items.length} places found`);
    
    // Convert to leads
    const allLeads: Lead[] = items.map(item => convertGooglePlaceToLead(item, city, category));
    
    // Filter out big chains and franchises
    const leads = allLeads.filter(lead => !isBigChainOrFranchise(lead));
    
    console.log(`📊 Filtered: ${allLeads.length} total → ${leads.length} small businesses`);
    console.log(`✅ Found ${leads.length} ${category} businesses in ${city}`);
    
    await logActivity({
      type: 'scrape',
      source: 'google',
      message: `Found ${leads.length} leads from Google Maps in ${city}`,
      status: 'success',
      details: { 
        count: leads.length, 
        city,
        category
      }
    });
    
    return leads;
  } catch (error: any) {
    console.error(`❌ Error scraping Google Maps for ${category} in ${city}:`, error.message);
    
    await logActivity({
      type: 'error',
      source: 'google',
      message: `Failed to scrape Google Maps for ${category} in ${city}: ${error.message}`,
      status: 'error',
      details: { city, category, error: error.message }
    });
    
    const serviceError = handleAPIError(error, 'Apify');
    
    // If it's a credit issue, return empty array but continue
    if (!serviceError.critical) {
      console.log(`⚠️  Continuing without Google Maps data for ${city}`);
      return [];
    }
    
    // If critical, throw the error
    throw error;
  }
}

// List of big chains, franchises, and marketing agencies to filter out
const BIG_CHAINS = [
  // Fast food
  'mcdonalds', 'mcdonald\'s', 'kfc', 'subway', 'dominos', 'domino\'s', 
  'pizza hut', 'hungry jacks', 'hungry jack\'s', 'burger king', 'red rooster',
  'nandos', 'nando\'s', 'guzman y gomez', 'grill\'d', 'boost juice',
  
  // Coffee chains
  'starbucks', 'gloria jeans', 'gloria jean\'s', 'the coffee club', 
  'muffin break', 'michel\'s patisserie', 'zarraffa\'s',
  
  // Retail chains
  'woolworths', 'coles', 'aldi', 'iga', 'bunnings', 'kmart', 'target',
  'big w', 'officeworks', 'jb hi-fi', 'harvey norman', 'the good guys',
  
  // Restaurants
  'tgif', 'tgi fridays', 'outback steakhouse', 'lone star', 'la porchetta',
  'hog\'s breath', 'sizzler', 'rashays', 'rashay\'s',
  
  // Other franchises
  'anytime fitness', 'f45', 'snap fitness', 'curves', 'jetts',
  'chemist warehouse', 'priceline', 'amcal', 'terry white',
  
  // Marketing agencies and big companies (FILTER THESE OUT!)
  'marketing agency', 'digital agency', 'creative agency', 'advertising agency',
  'pr agency', 'media agency', 'brand agency', 'marketing company',
  'digital marketing', 'seo agency', 'ppc agency', 'social media agency',
  'web design agency', 'graphic design agency', 'content marketing',
  'lead generation', 'growth agency', 'consulting group', 'consulting firm',
  'strategy agency', 'branding agency', 'communications agency',
  'public relations', 'marketing solutions', 'digital solutions',
  'business solutions', 'growth marketing', 'performance marketing',
  'full service agency', 'integrated agency', 'boutique agency',
  'marketing consultancy', 'business consultancy', 'strategy consultancy',
];

function isBigChainOrFranchise(lead: Lead): boolean {
  const businessNameLower = lead.businessName.toLowerCase();
  const descriptionLower = (lead.description || '').toLowerCase();
  
  // Check if it's a known chain or marketing agency
  if (BIG_CHAINS.some(chain => businessNameLower.includes(chain) || descriptionLower.includes(chain))) {
    return true;
  }
  
  // Check for franchise/corporate indicators
  const franchiseIndicators = [
    'franchise', 'franchising', 'pty ltd', 'limited', 'corporation',
    'inc.', 'incorporated', 'group', 'holdings', 'enterprises',
    'international', 'global', 'national', 'australia wide'
  ];
  
  if (franchiseIndicators.some(indicator => businessNameLower.includes(indicator))) {
    return true;
  }
  
  // Check for marketing/agency keywords in name or description
  const marketingKeywords = [
    'marketing', 'agency', 'digital', 'creative', 'advertising',
    'pr', 'media', 'brand', 'seo', 'ppc', 'social media',
    'web design', 'graphic design', 'content', 'lead generation',
    'growth', 'consulting', 'strategy', 'communications',
    'solutions', 'performance', 'full service', 'integrated'
  ];
  
  if (marketingKeywords.some(keyword => 
    businessNameLower.includes(keyword) || descriptionLower.includes(keyword)
  )) {
    return true;
  }
  
  // Check review count - if too many reviews, likely a big established business
  if (lead.reviewCount && lead.reviewCount > 150) {
    return true;
  }
  
  // Check for multiple locations indicator in description
  if (descriptionLower.includes('locations') || descriptionLower.includes('branches') || 
      descriptionLower.includes('chain') || descriptionLower.includes('franchise') ||
      descriptionLower.includes('multiple') || descriptionLower.includes('nationwide')) {
    return true;
  }
  
  // Check for big company indicators in description
  if (descriptionLower.includes('established') && descriptionLower.includes('years')) {
    return true;
  }
  
  return false;
}

function convertGooglePlaceToLead(place: any, city: string, category: string): Lead {
  return {
    source: 'google',
    businessName: place.title || place.name,
    email: undefined, // Google Maps doesn't provide emails directly
    phone: place.phone || place.phoneUnformatted,
    website: place.website,
    address: place.address || `${place.street || ''}, ${place.city || city}, ${place.state || ''} ${place.postalCode || ''}`.trim(),
    description: place.description || `${place.categoryName} - ${place.price || ''} ${place.totalScore ? `⭐ ${place.totalScore}/5` : ''} ${place.reviewsCount ? `(${place.reviewsCount} reviews)` : ''}`.trim(),
    rating: place.totalScore,
    reviewCount: place.reviewsCount,
    category: place.categoryName || category,
    city: city.toLowerCase(),
    location: place.address || `${city}, Australia`,
    businessHours: formatOpeningHours(place.openingHours),
    status: 'new',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function formatOpeningHours(hours: any[]): Record<string, string> | undefined {
  if (!hours || hours.length === 0) return undefined;
  
  const hoursMap: Record<string, string> = {};
  hours.forEach(day => {
    hoursMap[day.day] = day.hours;
  });
  
  return hoursMap;
}

export async function runMultiCityGoogleScraping(
  cities: string[],
  categories: string[],
  maxResultsPerSearch: number = 20
): Promise<void> {
  console.log('🚀 Starting multi-city Google Maps scraping...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await logActivity({
    type: 'scrape',
    source: 'google',
    message: 'Starting Google Maps scraping session',
    status: 'success'
  });
  
  await updateCronStatus('Google Maps Scraper', { 
    lastRun: new Date().toISOString() 
  });
  
  const allLeads: Lead[] = [];
  let successCount = 0;
  let failCount = 0;
  let totalLeadsCount = 0;
  
  const totalSearches = cities.length * categories.length;
  let currentSearch = 0;
  
  for (const city of cities) {
    for (const category of categories) {
      currentSearch++;
      console.log(`📍 [${currentSearch}/${totalSearches}] Processing ${category} in ${city}`);
      console.log('────────────────────────────────────────');
      
      try {
      const leads = await scrapeGoogleForLeads(city, category, maxResultsPerSearch);
        
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
        if (currentSearch < totalSearches) {
          console.log('⏳ Waiting 5 seconds before next search...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (error) {
        failCount++;
        console.error(`❌ Failed to scrape ${category} in ${city}`);
        console.log('');
      }
    }
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Scraping summary: ${successCount} successful, ${failCount} failed`);
  console.log(`📊 Total leads found: ${totalLeadsCount}`);
  
  // Remove duplicates based on business name and address
  const uniqueLeads = Array.from(
    new Map(allLeads.map(lead => 
      [`${lead.businessName}-${lead.address}`, lead]
    )).values()
  );
  
  console.log(`📊 Total unique leads: ${uniqueLeads.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('✅ Google Maps scraping completed');
  
  await updateCronStatus('Google Maps Scraper', { 
    status: 'active'
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Example: Search for small businesses in Melbourne and Sydney
  runMultiCityGoogleScraping(
    ['melbourne', 'sydney'],
    ['cafe', 'restaurant', 'salon', 'fitness', 'photography', 'plumber', 'electrician'],
    20
  )
    .then(() => console.log('✅ Google Maps scraping completed'))
    .catch(error => console.error('❌ Scraping failed:', error));
} 