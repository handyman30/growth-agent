export interface ServiceError {
  service: string;
  error: string;
  suggestion: string;
  critical: boolean;
}

export class APILimitError extends Error {
  constructor(public service: string, public details: string, public suggestion: string) {
    super(`${service} API limit reached: ${details}`);
    this.name = 'APILimitError';
  }
}

export function handleAPIError(error: any, service: string): ServiceError {
  const errorMessage = error.message || error.toString();
  const statusCode = error.response?.status || error.status;
  
  // OpenAI specific errors
  if (service === 'OpenAI') {
    if (errorMessage.includes('insufficient_quota') || statusCode === 429) {
      return {
        service: 'OpenAI',
        error: 'Insufficient credits or rate limit',
        suggestion: 'Add more credits at platform.openai.com/account/billing or wait 1 minute for rate limit',
        critical: true
      };
    }
    if (errorMessage.includes('invalid_api_key')) {
      return {
        service: 'OpenAI',
        error: 'Invalid API key',
        suggestion: 'Check your OPENAI_API_KEY in .env file',
        critical: true
      };
    }
  }
  
  // SendGrid specific errors
  if (service === 'SendGrid') {
    if (statusCode === 429) {
      return {
        service: 'SendGrid',
        error: 'Daily sending limit reached',
        suggestion: 'Free tier allows 100 emails/day. Upgrade at sendgrid.com/pricing',
        critical: false
      };
    }
    if (statusCode === 401) {
      return {
        service: 'SendGrid',
        error: 'Invalid API key',
        suggestion: 'Check your SENDGRID_API_KEY in .env file',
        critical: true
      };
    }
  }
  
  // Airtable specific errors
  if (service === 'Airtable') {
    if (errorMessage.includes('INVALID_REQUEST_UNKNOWN')) {
      return {
        service: 'Airtable',
        error: 'Invalid base or table configuration',
        suggestion: 'Check AIRTABLE_BASE_ID and ensure table "Leads" exists',
        critical: true
      };
    }
    if (statusCode === 422) {
      return {
        service: 'Airtable',
        error: 'Record limit reached',
        suggestion: 'Free tier allows 1,200 records. Delete old leads or upgrade',
        critical: false
      };
    }
    if (statusCode === 401) {
      return {
        service: 'Airtable',
        error: 'Invalid API key',
        suggestion: 'Check your AIRTABLE_API_KEY in .env file',
        critical: true
      };
    }
  }
  
  // Apify specific errors
  if (service === 'Apify') {
    if (errorMessage.includes('insufficient-credits') || errorMessage.includes('payment')) {
      return {
        service: 'Apify',
        error: 'Insufficient credits',
        suggestion: 'Add credits at console.apify.com/billing or use free actors',
        critical: false
      };
    }
    if (statusCode === 401) {
      return {
        service: 'Apify',
        error: 'Invalid API token',
        suggestion: 'Check your APIFY_API_TOKEN in .env file',
        critical: true
      };
    }
  }
  
  // Generic fallback
  return {
    service,
    error: errorMessage,
    suggestion: `Check ${service} dashboard for more details`,
    critical: false
  };
}

export async function checkServiceHealth(): Promise<ServiceError[]> {
  const errors: ServiceError[] = [];
  
  // Check environment variables
  const requiredEnvVars = [
    { key: 'OPENAI_API_KEY', service: 'OpenAI' },
    { key: 'SENDGRID_API_KEY', service: 'SendGrid' },
    { key: 'AIRTABLE_API_KEY', service: 'Airtable' },
    { key: 'AIRTABLE_BASE_ID', service: 'Airtable' },
    { key: 'APIFY_API_TOKEN', service: 'Apify' }
  ];
  
  for (const { key, service } of requiredEnvVars) {
    if (!process.env[key]) {
      errors.push({
        service,
        error: `Missing ${key}`,
        suggestion: `Add ${key} to your .env file`,
        critical: true
      });
    }
  }
  
  return errors;
}

// Notification system for critical errors
export function logServiceError(error: ServiceError): void {
  const emoji = error.critical ? '🚨' : '⚠️';
  const color = error.critical ? '\x1b[31m' : '\x1b[33m'; // Red or Yellow
  const reset = '\x1b[0m';
  
  console.log(`
${emoji} ${color}${error.service} Error${reset}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error: ${error.error}
Suggestion: ${error.suggestion}
Critical: ${error.critical ? 'YES - System may not function' : 'No - Can continue with limitations'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
  
  // If critical, we should also save to a log file
  if (error.critical) {
    import('fs').then(fs => {
      const logEntry = `${new Date().toISOString()} - ${error.service}: ${error.error}\n`;
      fs.promises.appendFile('error.log', logEntry).catch(() => {});
    });
  }
} 