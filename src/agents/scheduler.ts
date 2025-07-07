import { CronJob } from 'cron';
import { improvementAgent } from './improvement-agent.js';
import { githubPRAgent } from './github-pr-agent.js';
import { logActivity } from '../utils/system-status.js';

interface AgentSchedule {
  name: string;
  cron: string;
  description: string;
  enabled: boolean;
}

class AgentScheduler {
  private jobs: Map<string, CronJob> = new Map();
  private schedules: AgentSchedule[] = [
    {
      name: 'daily-analysis',
      cron: '0 9 * * *', // Every day at 9 AM
      description: 'Run daily project analysis and generate improvement suggestions',
      enabled: true
    },
    {
      name: 'weekly-improvements',
      cron: '0 10 * * 1', // Every Monday at 10 AM
      description: 'Create PRs for high-priority improvements',
      enabled: true
    },
    {
      name: 'monthly-review',
      cron: '0 11 1 * *', // First day of month at 11 AM
      description: 'Monthly project review and long-term planning',
      enabled: true
    }
  ];

  async startDailyAnalysis(): Promise<void> {
    try {
      console.log('🤖 Starting scheduled daily analysis...');
      
      await improvementAgent.runDailyAnalysis();
      
      await logActivity({
        type: 'info',
        source: 'system',
        message: 'Daily improvement analysis completed',
        status: 'success',
        details: { agent: 'improvement-agent' }
      });
      
      console.log('✅ Daily analysis completed successfully');
    } catch (error) {
      console.error('❌ Error in daily analysis:', error);
      
      await logActivity({
        type: 'error',
        source: 'system',
        message: 'Daily analysis failed',
        status: 'error',
        details: { error: (error as Error).message, agent: 'improvement-agent' }
      });
    }
  }

  async startWeeklyImprovements(): Promise<void> {
    try {
      console.log('🤖 Starting scheduled weekly improvements...');
      
      await githubPRAgent.runAutomatedImprovements();
      
      await logActivity({
        type: 'info',
        source: 'system',
        message: 'Weekly improvement PRs created',
        status: 'success',
        details: { agent: 'github-pr-agent' }
      });
      
      console.log('✅ Weekly improvements completed successfully');
    } catch (error) {
      console.error('❌ Error in weekly improvements:', error);
      
      await logActivity({
        type: 'error',
        source: 'system',
        message: 'Weekly improvements failed',
        status: 'error',
        details: { error: (error as Error).message, agent: 'github-pr-agent' }
      });
    }
  }

  async startMonthlyReview(): Promise<void> {
    try {
      console.log('🤖 Starting scheduled monthly review...');
      
      // Run comprehensive analysis
      await improvementAgent.runDailyAnalysis();
      
      // Generate monthly report
      const report = await improvementAgent.createImprovementReport();
      
      // Save monthly report
      const fs = await import('fs/promises');
      const path = await import('path');
      const reportPath = path.join(process.cwd(), 'reports', `monthly-${new Date().toISOString().slice(0, 7)}.md`);
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, report);
      
      await logActivity({
        type: 'info',
        source: 'system',
        message: 'Monthly review completed',
        status: 'success',
        details: { agent: 'monthly-review', reportPath }
      });
      
      console.log('✅ Monthly review completed successfully');
    } catch (error) {
      console.error('❌ Error in monthly review:', error);
      
      await logActivity({
        type: 'error',
        source: 'system',
        message: 'Monthly review failed',
        status: 'error',
        details: { error: (error as Error).message, agent: 'monthly-review' }
      });
    }
  }

  startScheduler(): void {
    console.log('🚀 Starting Agent Scheduler...');
    
    // Create cron jobs
    this.schedules.forEach(schedule => {
      if (!schedule.enabled) return;
      
      const job = new CronJob(schedule.cron, async () => {
        console.log(`⏰ Running scheduled job: ${schedule.name}`);
        
        switch (schedule.name) {
          case 'daily-analysis':
            await this.startDailyAnalysis();
            break;
          case 'weekly-improvements':
            await this.startWeeklyImprovements();
            break;
          case 'monthly-review':
            await this.startMonthlyReview();
            break;
          default:
            console.warn(`⚠️  Unknown scheduled job: ${schedule.name}`);
        }
      });
      
      this.jobs.set(schedule.name, job);
      job.start();
      
      console.log(`✅ Scheduled job "${schedule.name}" started (${schedule.cron})`);
    });
    
    console.log(`🎯 Agent Scheduler started with ${this.jobs.size} active jobs`);
  }

  stopScheduler(): void {
    console.log('🛑 Stopping Agent Scheduler...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️  Stopped job: ${name}`);
    });
    
    this.jobs.clear();
    console.log('✅ Agent Scheduler stopped');
  }

  getSchedules(): AgentSchedule[] {
    return this.schedules;
  }

  updateSchedule(name: string, enabled: boolean): void {
    const schedule = this.schedules.find(s => s.name === name);
    if (schedule) {
      schedule.enabled = enabled;
      
      if (enabled) {
        // Restart the job
        const job = this.jobs.get(name);
        if (job) {
          job.stop();
        }
        
        const newJob = new CronJob(schedule.cron, async () => {
          console.log(`⏰ Running scheduled job: ${schedule.name}`);
          // Add job logic here
        });
        
        this.jobs.set(name, newJob);
        newJob.start();
      } else {
        // Stop the job
        const job = this.jobs.get(name);
        if (job) {
          job.stop();
          this.jobs.delete(name);
        }
      }
    }
  }

  async runManualAnalysis(): Promise<void> {
    console.log('🔍 Running manual analysis...');
    await this.startDailyAnalysis();
  }

  async runManualImprovements(): Promise<void> {
    console.log('🔧 Running manual improvements...');
    await this.startWeeklyImprovements();
  }
}

// Export singleton instance
export const agentScheduler = new AgentScheduler();

// Start scheduler if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  agentScheduler.startScheduler();
  
  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, stopping scheduler...');
    agentScheduler.stopScheduler();
    process.exit(0);
  });
} 