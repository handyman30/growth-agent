import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Lead, SearchConfig } from '../types/index.js';
import { getAllLeads } from '../utils/airtable.js';
import { getStatus } from '../utils/system-status.js';
import { loadSearchConfigs } from '../utils/search-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ImprovementSuggestion {
  id: string;
  type: 'feature' | 'bugfix' | 'optimization' | 'ux' | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  rationale: string;
  estimatedImpact: string;
  implementation: string;
  filesToModify: string[];
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
}

interface ProjectAnalysis {
  totalLeads: number;
  leadsWithEmails: number;
  emailSuccessRate: number;
  scrapingSuccessRate: number;
  activeConfigs: number;
  systemHealth: string;
  recentErrors: string[];
  performanceMetrics: {
    avgResponseTime: number;
    errorRate: number;
    successRate: number;
  };
}

class ImprovementAgent {
  private suggestions: ImprovementSuggestion[] = [];
  private analysis: ProjectAnalysis | null = null;

  async analyzeProject(): Promise<ProjectAnalysis> {
    console.log('🔍 Analyzing project performance...');
    
    try {
      // Get current leads data
      const leads = await getAllLeads(1000);
      const leadsWithEmails = leads.filter(l => l.email && l.email.trim() !== '').length;
      
      // Get system status
      const status = await getStatus();
      
      // Get active configurations
      const configs = await loadSearchConfigs();
      const activeConfigs = configs.filter(c => c.active).length;
      
      // Calculate metrics
      const emailSuccessRate = leads.length > 0 ? (leadsWithEmails / leads.length) * 100 : 0;
      const scrapingSuccessRate = status.lastScrapeTime ? 95 : 60; // Simplified
      
      this.analysis = {
        totalLeads: leads.length,
        leadsWithEmails,
        emailSuccessRate,
        scrapingSuccessRate,
        activeConfigs,
        systemHealth: status.errors.length > 0 ? 'warning' : 'healthy',
        recentErrors: status.errors.map(e => e.message),
        performanceMetrics: {
          avgResponseTime: 200, // Mock data
          errorRate: status.errors.length,
          successRate: emailSuccessRate
        }
      };
      
      console.log('✅ Project analysis complete');
      return this.analysis;
    } catch (error) {
      console.error('❌ Error analyzing project:', error);
      throw error;
    }
  }

  async generateImprovementSuggestions(): Promise<ImprovementSuggestion[]> {
    if (!this.analysis) {
      await this.analyzeProject();
    }
    
    console.log('💡 Generating improvement suggestions...');
    
    const suggestions: ImprovementSuggestion[] = [];
    
    // Email success rate improvements
    if (this.analysis!.emailSuccessRate < 30) {
      suggestions.push({
        id: `email-${Date.now()}`,
        type: 'feature',
        priority: 'high',
        title: 'Enhance Email Enrichment Strategy',
        description: 'Implement multiple email finder services and website scraping to increase email success rate',
        rationale: `Current email success rate is ${this.analysis!.emailSuccessRate.toFixed(1)}%. Need to improve to reach target of 50%+`,
        estimatedImpact: 'Increase email success rate by 20-30%',
        implementation: `
1. Add Apollo.io API integration
2. Implement website email scraping with better patterns
3. Add email verification service
4. Create fallback strategies for failed enrichments
        `,
        filesToModify: [
          'src/utils/email-enrichment.ts',
          'src/dashboard/server.ts',
          'src/types/index.ts'
        ],
        createdAt: new Date(),
        status: 'pending'
      });
    }
    
    // Dashboard UX improvements
    if (this.analysis!.totalLeads > 100) {
      suggestions.push({
        id: `ux-${Date.now()}`,
        type: 'ux',
        priority: 'medium',
        title: 'Add Advanced Lead Filtering and Search',
        description: 'Implement advanced filtering, search, and bulk operations for better lead management',
        rationale: `Managing ${this.analysis!.totalLeads} leads requires better organization tools`,
        estimatedImpact: 'Improve lead management efficiency by 40%',
        implementation: `
1. Add search functionality
2. Implement multi-select and bulk operations
3. Add lead scoring and prioritization
4. Create saved filters and views
        `,
        filesToModify: [
          'src/dashboard/public/index.html',
          'src/dashboard/server.ts',
          'src/utils/airtable.ts'
        ],
        createdAt: new Date(),
        status: 'pending'
      });
    }
    
    // Automation improvements
    suggestions.push({
      id: `automation-${Date.now()}`,
      type: 'feature',
      priority: 'high',
      title: 'Implement Email Sequence Automation',
      description: 'Create automated email sequences with follow-ups and personalization',
      rationale: 'Single emails have low response rates. Sequences can improve engagement by 300%',
      estimatedImpact: 'Increase response rate by 200-300%',
      implementation: `
1. Create email sequence templates
2. Add sequence scheduling logic
3. Implement response tracking
4. Add sequence management UI
      `,
      filesToModify: [
        'src/templates/email-templates.ts',
        'src/email/sender.ts',
        'src/dashboard/public/index.html',
        'src/types/index.ts'
      ],
      createdAt: new Date(),
      status: 'pending'
    });
    
    // Performance improvements
    if (this.analysis!.performanceMetrics.errorRate > 5) {
      suggestions.push({
        id: `performance-${Date.now()}`,
        type: 'optimization',
        priority: 'medium',
        title: 'Implement Caching and Rate Limiting',
        description: 'Add intelligent caching and rate limiting to improve performance and reduce API costs',
        rationale: `Error rate of ${this.analysis!.performanceMetrics.errorRate}% indicates need for better error handling`,
        estimatedImpact: 'Reduce API costs by 30% and improve reliability',
        implementation: `
1. Add Redis caching for API responses
2. Implement intelligent rate limiting
3. Add retry logic with exponential backoff
4. Create performance monitoring
        `,
        filesToModify: [
          'src/utils/cache.ts',
          'src/utils/rate-limiter.ts',
          'src/dashboard/server.ts'
        ],
        createdAt: new Date(),
        status: 'pending'
      });
    }
    
    // Instagram DM automation
    suggestions.push({
      id: `instagram-${Date.now()}`,
      type: 'feature',
      priority: 'medium',
      title: 'Add Instagram DM Automation',
      description: 'Automate Instagram direct messages for leads without email addresses',
      rationale: 'Instagram leads often don\'t have emails. DMs can reach them directly',
      estimatedImpact: 'Reach 40% more leads through Instagram DMs',
      implementation: `
1. Integrate Instagram Graph API
2. Create DM templates
3. Add DM scheduling and automation
4. Implement DM response tracking
      `,
      filesToModify: [
        'src/utils/instagram-dm.ts',
        'src/templates/instagram-dm-templates.ts',
        'src/dashboard/public/index.html'
      ],
      createdAt: new Date(),
      status: 'pending'
    });
    
    this.suggestions = suggestions;
    console.log(`✅ Generated ${suggestions.length} improvement suggestions`);
    return suggestions;
  }

  async createImprovementReport(): Promise<string> {
    const suggestions = await this.generateImprovementSuggestions();
    
    const report = `
# HandyLabs Growth Agent - Improvement Report
Generated on: ${new Date().toISOString()}

## 📊 Current Status
- Total Leads: ${this.analysis?.totalLeads}
- Leads with Emails: ${this.analysis?.leadsWithEmails}
- Email Success Rate: ${this.analysis?.emailSuccessRate.toFixed(1)}%
- System Health: ${this.analysis?.systemHealth}
- Active Configurations: ${this.analysis?.activeConfigs}

## 🎯 Suggested Improvements

${suggestions.map(s => `
### ${s.title}
**Priority:** ${s.priority.toUpperCase()} | **Type:** ${s.type.toUpperCase()}

${s.description}

**Rationale:** ${s.rationale}

**Estimated Impact:** ${s.estimatedImpact}

**Implementation:**
${s.implementation}

**Files to Modify:** ${s.filesToModify.join(', ')}
`).join('\n')}

## 📈 Next Steps
1. Review suggestions by priority
2. Implement high-priority improvements
3. Test changes thoroughly
4. Monitor impact on metrics
    `;
    
    return report;
  }

  async saveSuggestions(): Promise<void> {
    const suggestionsFile = path.join(__dirname, '../../data/improvement-suggestions.json');
    
    try {
      await fs.mkdir(path.dirname(suggestionsFile), { recursive: true });
      await fs.writeFile(suggestionsFile, JSON.stringify({
        analysis: this.analysis,
        suggestions: this.suggestions,
        generatedAt: new Date().toISOString()
      }, null, 2));
      
      console.log('✅ Suggestions saved to data/improvement-suggestions.json');
    } catch (error) {
      console.error('❌ Error saving suggestions:', error);
    }
  }

  async runDailyAnalysis(): Promise<void> {
    console.log('🤖 Starting daily improvement analysis...');
    
    try {
      await this.analyzeProject();
      await this.generateImprovementSuggestions();
      await this.saveSuggestions();
      
      const report = await this.createImprovementReport();
      console.log('📋 Daily analysis complete. Report:');
      console.log(report);
      
    } catch (error) {
      console.error('❌ Error in daily analysis:', error);
    }
  }
}

// Export for use in other modules
export const improvementAgent = new ImprovementAgent();

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  improvementAgent.runDailyAnalysis()
    .then(() => console.log('✅ Daily analysis completed'))
    .catch(error => console.error('❌ Analysis failed:', error));
} 