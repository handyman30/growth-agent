import cron from 'node-cron';
import dotenv from 'dotenv';
import { scrapeInstagramDaily } from './scrapers/instagram.js';
import { runMultiCityGoogleScraping } from './scrapers/google.js';
import { runDailyEmailCampaign } from './email/sender.js';
import { getActiveConfigs, getSearchConfigs } from './utils/search-config.js';
import { checkServiceHealth, logServiceError } from './utils/error-handler.js';

dotenv.config();

console.log('🚀 HandyLabs Growth Agent Starting...');

// Check service health on startup
async function checkSystemHealth(): Promise<boolean> {
  console.log('🔍 Checking system health...\n');
  
  const errors = await checkServiceHealth();
  
  if (errors.length === 0) {
    console.log('✅ All services configured correctly!\n');
    return true;
  }
  
  // Log all errors
  errors.forEach(error => logServiceError(error));
  
  // Check if any are critical
  const criticalErrors = errors.filter(e => e.critical);
  if (criticalErrors.length > 0) {
    console.log('\n❌ Critical errors found. Please fix these before continuing.\n');
    return false;
  }
  
  console.log('\n⚠️  Non-critical issues found. System will run with limitations.\n');
  return true;
}

// Export function to start cron jobs
export function startCronJobs() {
  // Schedule daily lead scraping at 8 AM Melbourne time
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Running daily lead scraping...');
    try {
      await runDynamicLeadScraping();
    } catch (error) {
      console.error('Failed to run lead scraping:', error);
    }
  }, {
    timezone: 'Australia/Melbourne'
  });

  // Schedule daily email campaign at 9 AM Melbourne time
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Running daily email campaign...');
    try {
      await runDailyEmailCampaign();
    } catch (error) {
      console.error('Failed to run email campaign:', error);
    }
  }, {
    timezone: 'Australia/Melbourne'
  });

  // Keep the process running
  console.log('✅ Cron jobs scheduled!');
  console.log('📅 Scheduled tasks:');
  console.log('   - Lead scraping: Daily at 8 AM Melbourne time');
  console.log('   - Email campaign: Daily at 9 AM Melbourne time');
}

// Initialize system
async function init() {
  const isHealthy = await checkSystemHealth();
  
  if (!isHealthy) {
    console.log('Exiting due to critical errors. Fix the issues and restart.');
    process.exit(1);
  }
  
  startCronJobs();
  
  console.log('');
  console.log('🖥️  Dashboard: Run "npm run dashboard" to start the web interface');
  console.log('⚙️  Configure: Run "npm run config" to manage search settings');

  // Run initial scraping if in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('\n🔧 Development mode: Showing active configurations...');
    
    // Show current configurations
    try {
      const configs = await getActiveConfigs();
      console.log('\n📋 Active Search Configurations:');
      configs.forEach(config => {
        console.log(`- ${config.name}: ${config.cities.join(', ')} | ${config.categories.slice(0, 3).join(', ')}...`);
      });
      
      if (configs.length === 0) {
        console.log('No active configurations found. Create some at http://localhost:3000/config');
      }
    } catch (error) {
      console.error('Failed to load configurations:', error);
    }
  }
}

// Dynamic lead scraping based on configurations
async function runDynamicLeadScraping(): Promise<void> {
  console.log('🔍 Starting dynamic lead scraping...');
  
  const configs = await getActiveConfigs();
  console.log(`Found ${configs.length} active search configurations`);
  
  for (const config of configs) {
    console.log(`\n📋 Running: ${config.name}`);
    
    // Run Instagram scraping
    if (config.sources.includes('instagram') && config.keywords.length > 0) {
      console.log('Instagram scraping for:', config.keywords);
      // Instagram scraping logic here - would need to update the Instagram scraper
      // to accept dynamic keywords instead of hardcoded hashtags
    }
    
    // Run Google scraping
    if (config.sources.includes('google')) {
      await runMultiCityGoogleScraping(
        config.cities,
        config.categories,
        config.maxResultsPerSearch
      );
    }
    
    // Add delay between configs
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  console.log('\n✅ Dynamic lead scraping completed');
}

// Start the system
init().catch(error => {
  console.error('Failed to initialize system:', error);
  process.exit(1);
}); 