import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getLeadsForOutreach, getAllLeads, updateLeadStatus, updateLeadEmail, deleteLead } from '../utils/airtable.js';
import { generateInstagramDM } from '../utils/message-generator.js';
import { getPersonalizedDM } from '../templates/instagram-dm-templates.js';
import { sendEmail } from '../email/sender.js';
import { getTemplateForCategory } from '../templates/email-templates.js';
import { loadSearchConfigs, saveSearchConfigs, addSearchConfig, updateSearchConfig, deleteSearchConfig } from '../utils/search-config.js';
import { getStatus } from '../utils/system-status.js';
import { Lead, SearchConfig } from '../types/index.js';
import { enrichLeadWithEmail, checkHunterCredits } from '../utils/email-enrichment.js';
import { agentScheduler } from '../agents/scheduler.js';
import { improvementAgent } from '../agents/improvement-agent.js';
import { githubPRAgent } from '../agents/github-pr-agent.js';
import path from 'path';
import fs from 'fs/promises';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// API Routes
app.get('/api/leads', async (req, res) => {
  try {
    const source = req.query.source as string;
    const city = req.query.city as string;
    const category = req.query.category as string;
    const status = req.query.status as string;
    
    // Use getAllLeads to show all leads including Google Maps ones
    let leads = await getAllLeads(500);
    
    // Filter by query parameters
    if (source) leads = leads.filter(l => l.source === source);
    if (city) leads = leads.filter(l => l.city?.toLowerCase() === city.toLowerCase());
    if (category) leads = leads.filter(l => l.category?.toLowerCase().includes(category.toLowerCase()));
    if (status && status !== '') leads = leads.filter(l => l.status === status as Lead['status']);
    
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

app.post('/api/leads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // Handle "too-hard" status by using notes field
    if (status === 'too-hard') {
      await updateLeadStatus(id, 'new', `TOO HARD: ${notes || 'Marked as too hard'}`);
    } else {
      await updateLeadStatus(id, status, notes);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({ error: 'Failed to update lead status' });
  }
});

app.delete('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteLead(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

app.post('/api/generate-dm', async (req, res) => {
  try {
    const { lead } = req.body;
    
    // Map dynamic categories to DM template categories
    const dmCategory = mapToDMCategory(lead.category);
    
    // Use template-based generation for quick results
    const dmFromTemplate = getPersonalizedDM(
      dmCategory,
      {
        businessName: lead.businessName,
        ownerName: lead.ownerName,
        recentPost: lead.recentPosts?.[0]?.caption,
      }
    );
    
    // Also generate with GPT-4 for comparison
    const dmFromGPT = await generateInstagramDM(lead);
    
    res.json({
      template: dmFromTemplate,
      gpt: dmFromGPT,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate DM' });
  }
});

app.post('/api/send-email', async (req, res) => {
  try {
    const { lead } = req.body;
    
    // Get appropriate template based on category
    const template = getTemplateForCategory(lead.category);
    const result = await sendEmail(lead, template.id);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Search Configuration Routes
app.get('/api/configs', async (req, res) => {
  try {
    const configs = await loadSearchConfigs();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load configurations' });
  }
});

app.post('/api/configs', async (req, res) => {
  try {
    const config = await addSearchConfig(req.body);
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add configuration' });
  }
});

app.put('/api/configs/:id', async (req, res) => {
  try {
    await updateSearchConfig(req.params.id, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

app.delete('/api/configs/:id', async (req, res) => {
  try {
    await deleteSearchConfig(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

// Manual scraper run endpoint
app.post('/api/configs/:id/run', async (req, res) => {
  try {
    const configs = await loadSearchConfigs();
    const config = configs.find(c => c.id === req.params.id);
    
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    console.log(`🎯 Manual run initiated for: ${config.name}`);
    
    // Import scrapers
    const { scrapeInstagramForLeads } = await import('../scrapers/instagram.js');
    const { scrapeGoogleForLeads } = await import('../scrapers/google.js');
    const { saveLeadsToAirtable } = await import('../utils/airtable.js');
    
    const allLeads: Lead[] = [];
    
    // Run Instagram scraping if enabled
    if (config.sources.includes('instagram')) {
      for (const keyword of config.keywords || []) {
        try {
          const leads = await scrapeInstagramForLeads(keyword, config.maxResultsPerSearch || 30);
          allLeads.push(...leads);
        } catch (error) {
          console.error(`Error scraping Instagram for ${keyword}:`, error);
        }
      }
    }
    
    // Run Google Maps scraping if enabled
    if (config.sources.includes('google')) {
      for (const city of config.cities) {
        for (const category of config.categories) {
          try {
            const leads = await scrapeGoogleForLeads(city, category, config.maxResultsPerSearch || 30);
            allLeads.push(...leads);
          } catch (error) {
            console.error(`Error scraping Google Maps for ${category} in ${city}:`, error);
          }
        }
      }
    }
    
    // Remove duplicates
    const uniqueLeads = Array.from(
      new Map(allLeads.map(lead => 
        [`${lead.businessName}-${lead.address || lead.instagramHandle}`, lead]
      )).values()
    );
    
    // Save to Airtable
    if (uniqueLeads.length > 0) {
      await saveLeadsToAirtable(uniqueLeads);
    }
    
    res.json({
      success: true,
      totalLeads: uniqueLeads.length,
      breakdown: {
        instagram: allLeads.filter(l => l.source === 'instagram').length,
        google: allLeads.filter(l => l.source === 'google').length,
      }
    });
    
  } catch (error) {
    console.error('Error running manual scraper:', error);
    res.status(500).json({ error: 'Failed to run scraper' });
  }
});

// Email enrichment endpoint
app.post('/api/leads/:id/enrich-email', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the lead
    const leads = await getAllLeads(1000);
    const lead = leads.find(l => l.id === id);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Enrich with email
    const email = await enrichLeadWithEmail(lead);
    
    if (email) {
      await updateLeadEmail(id, email);
      res.json({ success: true, email });
    } else {
      res.json({ success: false, message: 'No email found' });
    }
  } catch (error) {
    console.error('Error enriching lead:', error);
    res.status(500).json({ error: 'Failed to enrich lead' });
  }
});

// Bulk email enrichment endpoint
app.post('/api/enrich-all-emails', async (req, res) => {
  try {
    const { limit = 10 } = req.body;
    
    // Get leads without emails but with websites
    const leads = await getAllLeads(1000);
    const leadsToEnrich = leads
      .filter(l => !l.email && l.website)
      .slice(0, limit);
    
    console.log(`🎯 Enriching ${leadsToEnrich.length} leads with emails...`);
    
    let enrichedCount = 0;
    const results = [];
    
    for (const lead of leadsToEnrich) {
      const email = await enrichLeadWithEmail(lead);
      
      if (email && lead.id) {
        await updateLeadEmail(lead.id, email);
        enrichedCount++;
        results.push({ lead: lead.businessName, email, success: true });
      } else {
        results.push({ lead: lead.businessName, success: false });
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    res.json({
      success: true,
      enrichedCount,
      totalProcessed: leadsToEnrich.length,
      results
    });
  } catch (error) {
    console.error('Error in bulk enrichment:', error);
    res.status(500).json({ error: 'Failed to enrich emails' });
  }
});

// Hunter credits check endpoint
app.get('/api/hunter-credits', async (req, res) => {
  try {
    const credits = await checkHunterCredits();
    res.json(credits || { available: 0, used: 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check credits' });
  }
});

// API endpoint for system status
app.get('/api/system-status', async (req, res) => {
  try {
    const status = await getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({ error: 'Failed to fetch system status' });
  }
});

// API endpoint for error logs
app.get('/api/errors', async (req, res) => {
  try {
    const fs = await import('fs/promises');
    const errorLog = await fs.readFile('error-log.json', 'utf-8').catch(() => '{}');
    res.json(JSON.parse(errorLog));
  } catch (error) {
    res.json({ errors: [], message: 'No errors logged' });
  }
});

// API endpoint for dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    // Use getAllLeads for accurate stats
    const leads = await getAllLeads(1000);
    
    const stats = {
      total: leads.length,
      bySource: {
        instagram: leads.filter(l => l.source === 'instagram').length,
        google: leads.filter(l => l.source === 'google').length,
      },
      byCity: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byStatus: {
        new: leads.filter(l => l.status === 'new').length,
        contacted: leads.filter(l => l.status === 'contacted').length,
        replied: leads.filter(l => l.status === 'replied').length,
        qualified: leads.filter(l => l.status === 'qualified').length,
      },
    };
    
    // Count by city
    leads.forEach(lead => {
      if (lead.city) {
        stats.byCity[lead.city] = (stats.byCity[lead.city] || 0) + 1;
      }
    });
    
    // Count by category
    leads.forEach(lead => {
      if (lead.category) {
        stats.byCategory[lead.category] = (stats.byCategory[lead.category] || 0) + 1;
      }
    });
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Agent management endpoints
app.get('/api/agents/schedules', (req, res) => {
  try {
    const schedules = agentScheduler.getSchedules();
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get schedules' });
  }
});

app.post('/api/agents/schedules/:name/toggle', (req, res) => {
  try {
    const { name } = req.params;
    const { enabled } = req.body;
    
    agentScheduler.updateSchedule(name, enabled);
    res.json({ success: true, enabled });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

app.post('/api/agents/analyze', async (req, res) => {
  try {
    console.log('🔍 Manual analysis requested');
    
    await improvementAgent.runDailyAnalysis();
    const report = await improvementAgent.createImprovementReport();
    
    res.json({ 
      success: true, 
      message: 'Analysis completed',
      report 
    });
  } catch (error) {
    console.error('Error in manual analysis:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

app.post('/api/agents/improve', async (req, res) => {
  try {
    console.log('🔧 Manual improvements requested');
    
    await githubPRAgent.runAutomatedImprovements();
    
    res.json({ 
      success: true, 
      message: 'Improvements processed' 
    });
  } catch (error) {
    console.error('Error in manual improvements:', error);
    res.status(500).json({ error: 'Improvements failed' });
  }
});

app.get('/api/agents/suggestions', async (req, res) => {
  try {
    const suggestionsFile = path.join(process.cwd(), 'data/improvement-suggestions.json');
    
    try {
      const data = await fs.readFile(suggestionsFile, 'utf-8');
      const suggestions = JSON.parse(data);
      res.json(suggestions);
    } catch (fileError) {
      res.json({ suggestions: [], analysis: null, generatedAt: null });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Serve the dashboard HTML
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Serve the configuration page
app.get('/config', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'config.html'));
});

// Targeted Instagram scrape endpoint
app.post('/api/instagram-scrape/targeted', async (req, res) => {
  try {
    console.log('🎯 Manual targeted Instagram scrape initiated');
    
    const { runTargetedInstagramScrape } = await import('../scrapers/instagram.js');
    
    // Run the targeted scrape
    await runTargetedInstagramScrape();
    
    res.json({
      success: true,
      totalLeads: 50, // Approximate based on 10 per category
      categories: ['cafe', 'restaurant', 'boutique', 'fitness', 'beauty']
    });
  } catch (error) {
    console.error('Error running targeted Instagram scrape:', error);
    res.status(500).json({ error: 'Failed to run targeted scrape' });
  }
});

// Helper function to map categories to DM templates
function mapToDMCategory(category: string): keyof typeof import('../templates/instagram-dm-templates.js').instagramDMTemplates {
  const categoryMap: Record<string, keyof typeof import('../templates/instagram-dm-templates.js').instagramDMTemplates> = {
    'cafe': 'cafe',
    'restaurant': 'restaurant',
    'influencer': 'influencer',
    'blogger': 'influencer',
    'boutique': 'boutique',
    'recruiter': 'general',
    'recruitment': 'general',
    'gym': 'fitness',
    'fitness': 'fitness',
    'yoga': 'fitness',
    'pilates': 'fitness',
  };
  
  // Check for partial matches
  const lowerCategory = category.toLowerCase();
  for (const [key, value] of Object.entries(categoryMap)) {
    if (lowerCategory.includes(key)) {
      return value;
    }
  }
  
  return 'general';
}

app.listen(PORT, () => {
  console.log(`🚀 Dashboard running at http://localhost:${PORT}`);
  console.log(`⚙️  Configuration UI at http://localhost:${PORT}/config`);
}); 