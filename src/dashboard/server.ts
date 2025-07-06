import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getLeadsForOutreach, updateLeadStatus } from '../utils/airtable.js';
import { generateInstagramDM } from '../utils/message-generator.js';
import { getPersonalizedDM } from '../templates/instagram-dm-templates.js';
import { sendEmail } from '../email/sender.js';
import { getTemplateForCategory } from '../templates/email-templates.js';
import { loadSearchConfigs, saveSearchConfigs, addSearchConfig, updateSearchConfig, deleteSearchConfig } from '../utils/search-config.js';
import { getStatus } from '../utils/system-status.js';
import { Lead, SearchConfig } from '../types/index.js';

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
    
    let leads = await getLeadsForOutreach(100);
    
    // Filter by query parameters
    if (source) leads = leads.filter(l => l.source === source);
    if (city) leads = leads.filter(l => l.city?.toLowerCase() === city.toLowerCase());
    if (category) leads = leads.filter(l => l.category?.toLowerCase().includes(category.toLowerCase()));
    
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

app.post('/api/leads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    await updateLeadStatus(id, status, notes);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lead status' });
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

// API endpoint for dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    const leads = await getLeadsForOutreach(1000);
    
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

// Serve the dashboard HTML
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Serve the configuration page
app.get('/config', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'config.html'));
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