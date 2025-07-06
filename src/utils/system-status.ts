import fs from 'fs/promises';
import path from 'path';

export interface SystemActivity {
  timestamp: string;
  type: 'scrape' | 'email' | 'error' | 'info';
  source?: 'instagram' | 'google' | 'email' | 'system';
  message: string;
  details?: any;
  status: 'success' | 'warning' | 'error';
}

export interface SystemStatus {
  lastScrapeTime?: string;
  lastEmailTime?: string;
  totalLeadsToday: number;
  totalEmailsSentToday: number;
  activities: SystemActivity[];
  errors: Array<{
    timestamp: string;
    message: string;
    source: string;
  }>;
  cronJobs: Array<{
    name: string;
    schedule: string;
    lastRun?: string;
    nextRun?: string;
    status: 'active' | 'paused' | 'error';
  }>;
}

const STATUS_FILE = 'system-status.json';

async function readStatus(): Promise<SystemStatus> {
  try {
    const data = await fs.readFile(STATUS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Default status if file doesn't exist
    return {
      totalLeadsToday: 0,
      totalEmailsSentToday: 0,
      activities: [],
      errors: [],
      cronJobs: [
        {
          name: 'Instagram Scraper',
          schedule: 'Every 2 hours (9 AM - 5 PM)',
          status: 'active'
        },
        {
          name: 'Google Maps Scraper',
          schedule: 'Every 3 hours',
          status: 'active'
        },
        {
          name: 'Email Sender',
          schedule: 'Every hour (10 AM - 4 PM)',
          status: 'active'
        }
      ]
    };
  }
}

async function writeStatus(status: SystemStatus): Promise<void> {
  // Keep only last 50 activities and 20 errors
  status.activities = status.activities.slice(-50);
  status.errors = status.errors.slice(-20);
  
  await fs.writeFile(STATUS_FILE, JSON.stringify(status, null, 2));
}

export async function logActivity(activity: Omit<SystemActivity, 'timestamp'>): Promise<void> {
  const status = await readStatus();
  
  status.activities.push({
    ...activity,
    timestamp: new Date().toISOString()
  });
  
  // Update relevant counters
  if (activity.type === 'scrape' && activity.status === 'success' && activity.details?.count) {
    status.totalLeadsToday += activity.details.count;
    status.lastScrapeTime = new Date().toISOString();
  }
  
  if (activity.type === 'email' && activity.status === 'success') {
    status.totalEmailsSentToday += 1;
    status.lastEmailTime = new Date().toISOString();
  }
  
  // Add to errors if it's an error
  if (activity.status === 'error') {
    status.errors.push({
      timestamp: new Date().toISOString(),
      message: activity.message,
      source: activity.source || 'system'
    });
  }
  
  await writeStatus(status);
}

export async function getStatus(): Promise<SystemStatus> {
  return await readStatus();
}

export async function resetDailyCounters(): Promise<void> {
  const status = await readStatus();
  status.totalLeadsToday = 0;
  status.totalEmailsSentToday = 0;
  await writeStatus(status);
  
  await logActivity({
    type: 'info',
    message: 'Daily counters reset',
    status: 'success'
  });
}

export async function updateCronStatus(
  jobName: string, 
  update: Partial<SystemStatus['cronJobs'][0]>
): Promise<void> {
  const status = await readStatus();
  const job = status.cronJobs.find(j => j.name === jobName);
  if (job) {
    Object.assign(job, update);
    await writeStatus(status);
  }
} 