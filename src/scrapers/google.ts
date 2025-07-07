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

export async function scrapeGoogleForLeads(
  city: string,
  category: string,
  maxResults: number = 50
): Promise<Lead[]> {
  console.log(`🔍 Searching Google Maps for ${category} in ${city}...`);
  console.log(`ℹ️  Note: Google Maps doesn't provide email addresses. To get emails:`);
  console.log(`    • Use Instagram scraper (emails often in bios)`);
  console.log(`    • Visit business websites manually`);
  console.log(`    • Use an email finder service\n`);
  
  try {
    const cityQuery = CITY_MAPPINGS[city.toLowerCase()] || `${city}, Australia`;
    
    // Run the Google Maps Extractor
    const run = await client.actor("compass/google-maps-extractor").call({
      searchStringsArray: [`${category} in ${cityQuery}`],
      locationQuery: cityQuery,
      language: 'en',
      maxCrawledPlacesPerSearch: maxResults,
      skipClosedPlaces: true,
      deeperCityScrape: false,
      searchMatching: 'all',
      placeMinimumStars: '',
    });

    // Get results from the run
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    console.log(`📊 Raw results: ${items.length} places found`);
    
    // Convert to leads
    const leads: Lead[] = items.map(item => convertGooglePlaceToLead(item, city, category));
    
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
  // Example: Search for restaurants and cafes in Melbourne and Sydney
  runMultiCityGoogleScraping(
    ['melbourne', 'sydney'],
    ['restaurant', 'cafe', 'marketing agency'],
    20
  )
    .then(() => console.log('✅ Google Maps scraping completed'))
    .catch(error => console.error('❌ Scraping failed:', error));
} 