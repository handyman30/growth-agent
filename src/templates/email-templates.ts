import { EmailTemplate } from '../types/index.js';

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'cafe-initial',
    name: 'Cafe Initial Outreach',
    subject: 'Saw your amazing {recentPostDetail} at {businessName} 🥐',
    body: `Hi {ownerName},

Just discovered {businessName} through your Instagram - that {recentPostDetail} looked incredible!

I help Melbourne cafes like yours create custom ordering apps that boost takeaway revenue by 30%. 

Quick example: Penny Drop Coffee in Carlton saw their morning rush orders double after launching their app - customers love ordering ahead and skipping the queue.

Would love to show you how we could help {businessName} capture more orders (especially during those crazy morning rushes).

Worth a quick coffee chat next week? I'm local and happy to come by.

Cheers,
Handy Hasan
HandyLabs.live
P.S. Your {specificMenuItemOrFeature} sounds amazing - definitely need to try it!`,
    category: 'cafe',
    variables: ['businessName', 'ownerName', 'recentPostDetail', 'specificMenuItemOrFeature'],
  },
  {
    id: 'influencer-initial',
    name: 'Influencer Initial Outreach',
    subject: 'Love your content! Partnership opportunity 🚀',
    body: `Hey {ownerName}!

Been following your journey on @{instagramHandle} - your {contentTheme} content is 🔥

I run HandyLabs, and we're looking for Melbourne influencers to partner with. We build custom apps and websites for local businesses, and think your audience would love what we do.

Here's the deal:
- We'll create a custom landing page for your followers
- You get 20% commission on any referrals
- Plus a free website/app for your own brand if you want one

Some of our recent work: {recentProjectExample}

Interested in chatting about how we could work together?

Best,
Handy
@handylabs.live`,
    category: 'influencer',
    variables: ['ownerName', 'instagramHandle', 'contentTheme', 'recentProjectExample'],
  },
  {
    id: 'smb-initial',
    name: 'SMB Initial Outreach',
    subject: 'Quick idea to boost {businessName} online presence',
    body: `Hi {ownerName},

I came across {businessName} and noticed you're doing amazing things in {businessCategory}!

I help Melbourne businesses like yours level up their digital presence. Recently helped {similarBusiness} increase their online bookings by 40% with a custom booking system.

For {businessName}, I'm thinking:
{customIdea1}
{customIdea2}
{customIdea3}

Would you be open to a 15-min call to explore if this could work for you?

I'm based in Melbourne and understand the local market - happy to meet in person too.

Best regards,
Handy Hasan
Founder, HandyLabs
handyhasan@handylabs.live
handylabs.live`,
    category: 'smb',
    variables: ['businessName', 'ownerName', 'businessCategory', 'similarBusiness', 'customIdea1', 'customIdea2', 'customIdea3'],
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
    subject: 'Helping {businessName} grow digitally in {city}',
    body: `Hi {ownerName},

I discovered {businessName} while researching successful {category} businesses in {city}.

At HandyLabs, we specialize in creating custom digital solutions for Australian businesses. Whether it's:
- A mobile app for customer engagement
- An automated booking system
- A modern website that converts visitors to customers
- AI-powered tools to streamline operations

We've helped dozens of {city} businesses like yours increase their revenue and reduce operational headaches.

Would you be interested in a brief chat about how we could help {businessName} achieve similar results?

Best regards,
Handy Hasan
Founder, HandyLabs
handyhasan@handylabs.live
handylabs.live`,
    category: 'general',
    variables: ['businessName', 'ownerName', 'category', 'city'],
  },
  {
    id: 'recruiter-initial',
    name: 'Recruiter Outreach',
    subject: 'Streamline {businessName} hiring process with AI',
    body: `Hi {ownerName},

I noticed {businessName} is actively helping companies find talent in {city}. 

We've built AI-powered recruitment tools that help agencies like yours:
- Automate candidate screening (save 10+ hours/week)
- Create custom applicant tracking systems
- Build branded career portals for clients
- Generate personalized outreach at scale

Recently helped a Sydney recruitment firm reduce time-to-fill by 40% while improving candidate quality.

Worth a quick chat to explore how we could help {businessName} place more candidates, faster?

Best,
Handy Hasan
HandyLabs.live`,
    category: 'recruiter',
    variables: ['businessName', 'ownerName', 'city'],
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