import { EmailTemplate } from '../types/index.js';

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'cafe-initial',
    name: 'Cafe Initial Outreach',
    subject: 'Quick question about {businessName}',
    body: `Hi {ownerName},

I'm Handy from HandyLabs.live - we build software for Australian businesses.

Found {businessName} and reckon we could help improve your operations. We've identified key areas where software can streamline things for cafes like yours.

Let's have a chat? I'm local and can swing by for a coffee.

Cheers,
Handy
handylabs.live`,
    category: 'cafe',
    variables: ['businessName', 'ownerName'],
  },
  {
    id: 'influencer-initial',
    name: 'Influencer Initial Outreach',
    subject: 'Partnership idea for {businessName}',
    body: `Hi {ownerName},

I'm Handy from HandyLabs.live - we build software for Australian businesses.

Found {businessName} and reckon we could work together. We've got some ideas on how software can help grow your business.

Let's have a chat?

Cheers,
Handy
handylabs.live`,
    category: 'influencer',
    variables: ['businessName', 'ownerName'],
  },
  {
    id: 'smb-initial',
    name: 'SMB Initial Outreach',
    subject: 'Software idea for {businessName}',
    body: `Hi {ownerName},

I'm Handy from HandyLabs.live - we build software for Australian businesses.

Found {businessName} and reckon we could help improve your operations. We've identified key areas where software can streamline things for your business.

Let's have a chat?

Cheers,
Handy
handylabs.live`,
    category: 'smb',
    variables: ['businessName', 'ownerName'],
  },
  {
    id: 'follow-up-1',
    name: 'First Follow Up',
    subject: 'Re: {originalSubject}',
    body: `Hi {ownerName},

Just floating this back to the top of your inbox 😊

I know you're busy running {businessName}, but I genuinely think we could help you {mainBenefit}.

Even if now's not the right time, I'd love to connect and share some free tips on improving your digital presence.

Are you free for a quick 10-minute call this week?

Cheers,
Handy`,
    category: 'general',
    variables: ['ownerName', 'businessName', 'originalSubject', 'mainBenefit'],
  },
  {
    id: 'generic-initial',
    name: 'Generic Business Outreach',
    subject: 'Software idea for {businessName}',
    body: `Hi {ownerName},

I'm Handy from HandyLabs.live - we build software for Australian businesses.

Found {businessName} and reckon we could help improve your operations. We've identified key areas where software can streamline things for your business.

Let's have a chat?

Cheers,
Handy
handylabs.live`,
    category: 'general',
    variables: ['businessName', 'ownerName'],
  },
  {
    id: 'recruiter-initial',
    name: 'Recruiter Outreach',
    subject: 'Software idea for {businessName}',
    body: `Hi {ownerName},

I'm Handy from HandyLabs.live - we build software for Australian businesses.

Found {businessName} and reckon we could help improve your operations. We've identified key areas where software can streamline things for your business.

Let's have a chat?

Cheers,
Handy
handylabs.live`,
    category: 'recruiter',
    variables: ['businessName', 'ownerName'],
  },
];

// Get template by category with fallback to generic
export function getTemplateForCategory(category: string): EmailTemplate {
  // First try exact match
  let template = emailTemplates.find(t => t.category === category.toLowerCase());
  
  // If no exact match, try partial match
  if (!template) {
    template = emailTemplates.find(t => 
      category.toLowerCase().includes(t.category) || 
      t.category.includes(category.toLowerCase())
    );
  }
  
  // Fallback to generic template
  if (!template) {
    template = emailTemplates.find(t => t.id === 'generic-initial');
  }
  
  return template || emailTemplates[0]; // Ultimate fallback
}

export function getTemplate(templateId: string): EmailTemplate | undefined {
  return emailTemplates.find(t => t.id === templateId);
}

export function getTemplatesByCategory(category: EmailTemplate['category']): EmailTemplate[] {
  return emailTemplates.filter(t => t.category === category);
} 