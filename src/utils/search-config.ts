import { SearchConfig } from '../types/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, '../../search-configs.json');

// Default search configurations
export const DEFAULT_CONFIGS: SearchConfig[] = [
  {
    id: 'melbourne-food-businesses',
    name: 'Melbourne Food & Hospitality',
    sources: ['instagram', 'google'],
    cities: ['melbourne'],
    categories: ['cafe', 'restaurant', 'bar', 'bakery'],
    keywords: ['#melbournecafe', '#melbournefoodie', '#melbournerestaurant'],
    maxResultsPerSearch: 30,
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'melbourne-beauty-wellness',
    name: 'Melbourne Beauty & Wellness',
    sources: ['instagram', 'google'],
    cities: ['melbourne'],
    categories: ['salon', 'spa', 'fitness', 'massage', 'tattoo', 'piercing'],
    keywords: ['#melbournebeauty', '#melbournesalon', '#melbournespa', '#melbournefitness'],
    maxResultsPerSearch: 30,
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'melbourne-trades-services',
    name: 'Melbourne Trades & Services',
    sources: ['google'],
    cities: ['melbourne'],
    categories: ['plumber', 'electrician', 'carpenter', 'cleaner'],
    keywords: [],
    maxResultsPerSearch: 25,
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'melbourne-professional-services',
    name: 'Melbourne Professional Services',
    sources: ['google'],
    cities: ['melbourne'],
    categories: ['photography', 'design', 'accountant', 'lawyer'],
    keywords: [],
    maxResultsPerSearch: 25,
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'sydney-small-businesses',
    name: 'Sydney Small Businesses',
    sources: ['instagram', 'google'],
    cities: ['sydney'],
    categories: ['cafe', 'restaurant', 'salon', 'fitness', 'photography'],
    keywords: ['#sydneycafe', '#sydneyfoodie', '#sydneybeauty'],
    maxResultsPerSearch: 30,
    active: true,
    createdAt: new Date(),
  },
];

export async function loadSearchConfigs(): Promise<SearchConfig[]> {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.log('No existing configs found, using defaults');
    await saveSearchConfigs(DEFAULT_CONFIGS);
    return DEFAULT_CONFIGS;
  }
}

export async function saveSearchConfigs(configs: SearchConfig[]): Promise<void> {
  await fs.writeFile(CONFIG_FILE, JSON.stringify(configs, null, 2));
  console.log(`✅ Saved ${configs.length} search configurations`);
}

export async function addSearchConfig(config: Omit<SearchConfig, 'id' | 'createdAt'>): Promise<SearchConfig> {
  const configs = await loadSearchConfigs();
  
  const newConfig: SearchConfig = {
    ...config,
    id: `config-${Date.now()}`,
    createdAt: new Date(),
  };
  
  configs.push(newConfig);
  await saveSearchConfigs(configs);
  
  console.log(`✅ Added new search config: ${newConfig.name}`);
  return newConfig;
}

export async function updateSearchConfig(id: string, updates: Partial<SearchConfig>): Promise<void> {
  const configs = await loadSearchConfigs();
  const index = configs.findIndex(c => c.id === id);
  
  if (index === -1) {
    throw new Error(`Config ${id} not found`);
  }
  
  configs[index] = { ...configs[index], ...updates };
  await saveSearchConfigs(configs);
  
  console.log(`✅ Updated config: ${configs[index].name}`);
}

export async function deleteSearchConfig(id: string): Promise<void> {
  const configs = await loadSearchConfigs();
  const filtered = configs.filter(c => c.id !== id);
  
  if (filtered.length === configs.length) {
    throw new Error(`Config ${id} not found`);
  }
  
  await saveSearchConfigs(filtered);
  console.log(`✅ Deleted config: ${id}`);
}

export async function getActiveConfigs(): Promise<SearchConfig[]> {
  const configs = await loadSearchConfigs();
  return configs.filter(c => c.active);
}

// Interactive CLI for managing configs
export async function runConfigManager(): Promise<void> {
  console.log('🔧 Search Configuration Manager');
  console.log('==============================');
  
  const configs = await loadSearchConfigs();
  
  console.log('\nCurrent Configurations:');
  configs.forEach((config, index) => {
    console.log(`\n${index + 1}. ${config.name} (${config.active ? '✅ Active' : '❌ Inactive'})`);
    console.log(`   Cities: ${config.cities.join(', ')}`);
    console.log(`   Categories: ${config.categories.join(', ')}`);
    console.log(`   Sources: ${config.sources.join(', ')}`);
  });
  
  console.log('\n📝 To add/edit configs, modify search-configs.json');
  console.log('💡 Or use the dashboard at http://localhost:3000/config');
}

// Example: Create a custom config programmatically
export async function createCustomConfig(
  name: string,
  cities: string[],
  categories: string[],
  sources: ('instagram' | 'google')[],
  keywords: string[] = []
): Promise<SearchConfig> {
  return addSearchConfig({
    name,
    sources,
    cities,
    categories,
    keywords,
    maxResultsPerSearch: 30,
    active: true,
  });
}

export async function getSearchConfigs(): Promise<SearchConfig[]> {
  const configs = await loadSearchConfigs();
  return configs.filter(config => config.active);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runConfigManager()
    .then(() => console.log('\n✅ Config manager completed'))
    .catch(error => console.error('❌ Error:', error));
} 