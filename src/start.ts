import { startCronJobs } from './index.js';
import './dashboard/server.js';

console.log('🚀 Starting HandyLabs Growth Agent...');

// Start cron jobs
startCronJobs();

console.log('✅ System started successfully');
console.log('📊 Dashboard available at http://localhost:3000');
console.log('⚙️  Cron jobs are running in the background'); 