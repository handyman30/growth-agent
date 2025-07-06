import puppeteer, { Page } from 'puppeteer';
import { Lead, GooglePlace } from '../types/index.js';
import { saveLeadsToAirtable } from '../utils/airtable.js';

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
  console.log(`🔍 Searching Google for ${category} in ${city}...`);
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Use Google Maps search
    const cityQuery = CITY_MAPPINGS[city.toLowerCase()] || `${city}, Australia`;
    const searchQuery = `${category} in ${cityQuery}`;
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
    
    console.log(`📍 Searching: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    
    // Wait for results to load
    await page.waitForSelector('div[role="article"]', { timeout: 10000 }).catch(() => {});
    
    // Scroll to load more results
    await autoScroll(page, maxResults);
    
    // Extract business data
    const places = await page.evaluate(() => {
      const results: any[] = [];
      const elements = document.querySelectorAll('div[role="article"]');
      
      elements.forEach(el => {
        try {
          const nameEl = el.querySelector('h3');
          const ratingEl = el.querySelector('span[role="img"]');
          const reviewCountEl = el.querySelector('span[aria-label*="reviews"]');
          const addressEl = el.querySelector('span[aria-label*="address"]');
          const phoneEl = el.querySelector('span[aria-label*="phone"]');
          const websiteEl = el.querySelector('a[data-value*="website"]');
          
          if (nameEl) {
            results.push({
              name: nameEl.textContent?.trim(),
              rating: ratingEl ? parseFloat(ratingEl.getAttribute('aria-label')?.match(/[\d.]+/)?.[0] || '0') : undefined,
              reviewCount: reviewCountEl ? parseInt(reviewCountEl.textContent?.match(/\d+/)?.[0] || '0') : undefined,
              address: addressEl?.textContent?.trim(),
              phone: phoneEl?.textContent?.trim(),
              website: websiteEl?.getAttribute('href'),
            });
          }
        } catch (e) {
          console.error('Error extracting place:', e);
        }
      });
      
      return results;
    });
    
    // Click on each result to get more details
    const detailedPlaces: GooglePlace[] = [];
    
    for (let i = 0; i < Math.min(places.length, maxResults); i++) {
      try {
        const elements = await page.$$('div[role="article"]');
        if (elements[i]) {
          await elements[i].click();
          await page.waitForTimeout(2000);
          
          const details = await page.evaluate(() => {
            const getTextContent = (selector: string) => {
              const el = document.querySelector(selector);
              return el?.textContent?.trim();
            };
            
            // Extract email if available
            const emailLink = document.querySelector('a[href^="mailto:"]');
            const email = emailLink?.getAttribute('href')?.replace('mailto:', '');
            
            // Extract phone
            const phoneButton = Array.from(document.querySelectorAll('button')).find(
              btn => btn.textContent?.includes('Call')
            );
            const phoneText = phoneButton?.getAttribute('aria-label');
            const phone = phoneText?.match(/[\d\s+-]+/)?.[0]?.trim();
            
            // Extract website
            const websiteButton = Array.from(document.querySelectorAll('a')).find(
              a => a.textContent?.includes('Website')
            );
            const website = websiteButton?.getAttribute('href');
            
            // Extract hours
            const hoursButton = Array.from(document.querySelectorAll('button')).find(
              btn => btn.getAttribute('aria-label')?.includes('hours')
            );
            
            return {
              email,
              phone,
              website,
              description: getTextContent('div[role="main"] > div > div > div > div > div > div > span'),
            };
          });
          
          detailedPlaces.push({
            placeId: `google-${Date.now()}-${i}`,
            name: places[i].name || '',
            address: places[i].address || '',
            phone: details.phone || places[i].phone,
            website: details.website || places[i].website,
            rating: places[i].rating,
            reviewCount: places[i].reviewCount,
            types: [category],
            businessStatus: 'operational',
          });
        }
      } catch (e) {
        console.error(`Error getting details for place ${i}:`, e);
      }
    }
    
    console.log(`✅ Found ${detailedPlaces.length} ${category} businesses in ${city}`);
    
    // Convert to Lead format
    return detailedPlaces.map(place => convertGooglePlaceToLead(place, city, category));
    
  } catch (error) {
    console.error(`❌ Error scraping Google for ${category} in ${city}:`, error);
    return [];
  } finally {
    await browser.close();
  }
}

async function autoScroll(page: Page, maxScrolls: number = 10): Promise<void> {
  await page.evaluate(async (maxScrolls: number) => {
    const scrollContainer = document.querySelector('div[role="feed"]') || document.body;
    let previousHeight = 0;
    let scrollCount = 0;
    
    while (scrollCount < maxScrolls) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentHeight = scrollContainer.scrollHeight;
      if (currentHeight === previousHeight) break;
      
      previousHeight = currentHeight;
      scrollCount++;
    }
  }, maxScrolls);
}

function convertGooglePlaceToLead(place: GooglePlace, city: string, category: string): Lead {
  return {
    source: 'google',
    businessName: place.name,
    email: undefined, // Will be enriched later
    phone: place.phone,
    website: place.website,
    address: place.address,
    description: `${place.rating ? `⭐ ${place.rating}/5` : ''} ${place.reviewCount ? `(${place.reviewCount} reviews)` : ''}`.trim(),
    rating: place.rating,
    reviewCount: place.reviewCount,
    category: category,
    city: city,
    location: place.address,
    businessHours: place.hours,
    status: 'new',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Alternative: Use SerpAPI for more reliable results (requires API key)
export async function scrapeGoogleWithSerpAPI(
  city: string,
  category: string,
  apiKey: string,
  maxResults: number = 50
): Promise<Lead[]> {
  console.log(`🔍 Searching Google via SerpAPI for ${category} in ${city}...`);
  
  try {
    const cityQuery = CITY_MAPPINGS[city.toLowerCase()] || `${city}, Australia`;
    const response = await fetch(
      `https://serpapi.com/search.json?` + 
      new URLSearchParams({
        api_key: apiKey,
        engine: 'google_maps',
        q: `${category} in ${cityQuery}`,
        ll: getCoordinatesForCity(city),
        type: 'search',
        limit: maxResults.toString(),
      })
    );
    
    const data = await response.json();
    
    if (!data.local_results) {
      console.log('No results found');
      return [];
    }
    
    const leads: Lead[] = data.local_results.map((result: any) => ({
      source: 'google',
      businessName: result.title,
      phone: result.phone,
      website: result.website,
      address: result.address,
      description: result.description,
      rating: result.rating,
      reviewCount: result.reviews,
      category: category,
      city: city,
      location: result.address,
      businessHours: result.hours,
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    
    console.log(`✅ Found ${leads.length} ${category} businesses in ${city}`);
    return leads;
    
  } catch (error) {
    console.error(`❌ Error with SerpAPI:`, error);
    return [];
  }
}

function getCoordinatesForCity(city: string): string {
  const coordinates: Record<string, string> = {
    'melbourne': '-37.8136,144.9631',
    'sydney': '-33.8688,151.2093',
    'adelaide': '-34.9285,138.6007',
    'brisbane': '-27.4698,153.0251',
    'perth': '-31.9505,115.8605',
  };
  
  return coordinates[city.toLowerCase()] || '-37.8136,144.9631'; // Default to Melbourne
}

export async function runMultiCityGoogleScraping(
  cities: string[],
  categories: string[],
  maxResultsPerSearch: number = 20
): Promise<void> {
  console.log('🚀 Starting multi-city Google scraping...');
  
  const allLeads: Lead[] = [];
  
  for (const city of cities) {
    for (const category of categories) {
      const leads = await scrapeGoogleForLeads(city, category, maxResultsPerSearch);
      allLeads.push(...leads);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Remove duplicates based on business name and address
  const uniqueLeads = Array.from(
    new Map(allLeads.map(lead => 
      [`${lead.businessName}-${lead.address}`, lead]
    )).values()
  );
  
  console.log(`📊 Total unique leads found: ${uniqueLeads.length}`);
  
  // Save to Airtable
  if (uniqueLeads.length > 0) {
    await saveLeadsToAirtable(uniqueLeads);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Example: Search for restaurants and cafes in Melbourne and Sydney
  runMultiCityGoogleScraping(
    ['melbourne', 'sydney'],
    ['restaurant', 'cafe', 'marketing agency'],
    20
  )
    .then(() => console.log('✅ Google scraping completed'))
    .catch(error => console.error('❌ Scraping failed:', error));
}

async function scrapeGoogleMapsForLeads(
  query: string,
  city: string,
  maxResults: number = 20
): Promise<Lead[]> {
  const searchQuery = `${query} in ${city}, Australia`;
  console.log(`🔍 Searching Google Maps for: ${searchQuery}`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    // Navigate to Google Maps
    await page.goto('https://www.google.com/maps', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Accept cookies if present
    try {
      await page.waitForSelector('button[aria-label*="Accept all"]', { timeout: 5000 });
      await page.click('button[aria-label*="Accept all"]');
    } catch (e) {
      // Cookie banner might not be present
    }
    
    // Wait for search box and search
    await page.waitForSelector('input#searchboxinput', { timeout: 10000 });
    await page.type('input#searchboxinput', searchQuery);
    await page.keyboard.press('Enter');
    
    // Wait for results with better error handling
    try {
      await page.waitForSelector('div[role="article"]', { timeout: 15000 });
    } catch (e) {
      console.log('⚠️  No results found for this search');
      return [];
    }
    
    // Scroll to load more results
    await autoScroll(page, 5);
    
    // Extract place data
    const places = await page.evaluate(() => {
      const results: any[] = [];
      const articles = document.querySelectorAll('div[role="article"]');
      
      articles.forEach((article) => {
        try {
          const name = article.querySelector('h3')?.textContent || '';
          const ratingEl = article.querySelector('span[role="img"]');
          const rating = ratingEl ? parseFloat(ratingEl.getAttribute('aria-label')?.match(/[\d.]+/)?.[0] || '0') : 0;
          const reviewCountText = article.querySelector('span[aria-label*="reviews"]')?.textContent || '';
          const reviewCount = parseInt(reviewCountText.match(/\d+/)?.[0] || '0');
          const address = article.querySelector('span[jsan*="address"]')?.textContent || '';
          
          if (name) {
            results.push({
              name,
              rating,
              reviewCount,
              address
            });
          }
        } catch (e) {
          // Skip this result if parsing fails
        }
      });
      
      return results;
    });
    
    console.log(`📍 Found ${places.length} places`);
    
    const leads: Lead[] = [];
    
    // Get details for each place
    for (let i = 0; i < Math.min(places.length, maxResults); i++) {
      try {
        const place = places[i];
        console.log(`📍 Getting details for: ${place.name}`);
        
        // Click on the place
        const placeElements = await page.$$('div[role="article"] h3');
        if (placeElements[i]) {
          await placeElements[i].click();
          
          // Wait for details panel
          await page.waitForSelector('div[role="main"]', { timeout: 5000 });
          await page.waitForTimeout(1000); // Let details load
          
          // Extract detailed information
          const details = await page.evaluate(() => {
            const getTextContent = (selector: string) => {
              const element = document.querySelector(selector);
              return element?.textContent?.trim() || undefined;
            };
            
            // Extract phone
            const phoneEl = document.querySelector('button[data-tooltip*="phone"]');
            const phone = phoneEl?.getAttribute('aria-label')?.replace('Phone:', '').trim() || undefined;
            
            // Extract website
            const websiteEl = document.querySelector('a[data-tooltip*="website"]');
            const website = websiteEl?.getAttribute('href') || undefined;
            
            // Extract hours
            const hoursButton = document.querySelector('button[data-item-id*="hours"]');
            const hoursText = hoursButton?.querySelector('div[class*="text"]')?.textContent;
            
            return {
              phone,
              website,
              hoursText
            };
          });
          
          // Create lead object
          const lead: Lead = {
            source: 'google',
            businessName: place.name,
            address: place.address,
            phone: details.phone,
            website: details.website,
            rating: place.rating,
            reviewCount: place.reviewCount,
            category: categorizeGoogleBusiness(query),
            city: city.toLowerCase(),
            location: place.address,
            status: 'new',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Only add if has contact info
          if (lead.phone || lead.website) {
            leads.push(lead);
          }
        }
      } catch (error: any) {
        console.warn(`⚠️  Failed to get details for place ${i}:`, error.message);
        // Continue with next place
      }
    }
    
    return leads;
    
  } catch (error) {
    console.error('❌ Error scraping Google Maps:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

function categorizeGoogleBusiness(query: string): string {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('cafe') || queryLower.includes('coffee')) return 'cafe';
  if (queryLower.includes('restaurant') || queryLower.includes('dining')) return 'restaurant';
  if (queryLower.includes('boutique') || queryLower.includes('fashion')) return 'boutique';
  if (queryLower.includes('recruiter') || queryLower.includes('recruitment')) return 'recruiter';
  if (queryLower.includes('service') || queryLower.includes('consulting')) return 'service';
  
  return 'other';
} 