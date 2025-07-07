export const instagramDMTemplates = {
  cafe: [
    "Hey! We build software for Australian businesses. Found {business_name} and reckon we could help improve your operations. Let's chat?",
    "Hi! I'm Handy from HandyLabs.live - we've identified key areas where software can help your business. Worth a quick chat?",
    "Hey {business_name}! We build software for Aussie businesses. Let's have a chat about how we can help?",
  ],
  
  influencer: [
    "Hey! We build software for Australian businesses. Found {business_name} and reckon we could work together. Let's chat?",
    "Hi! I'm Handy from HandyLabs.live - we've got some ideas on how software can help grow your business. Worth a chat?",
    "Hey {business_name}! We build software for Aussie businesses. Let's have a chat about how we can help?",
  ],
  
  boutique: [
    "Hey! We build software for Australian businesses. Found {business_name} and reckon we could help improve your operations. Let's chat?",
    "Hi! I'm Handy from HandyLabs.live - we've identified key areas where software can help your business. Worth a quick chat?",
    "Hey {business_name}! We build software for Aussie businesses. Let's have a chat about how we can help?",
  ],
  
  restaurant: [
    "Hey! We build software for Australian businesses. Found {business_name} and reckon we could help improve your operations. Let's chat?",
    "Hi! I'm Handy from HandyLabs.live - we've identified key areas where software can help your business. Worth a quick chat?",
    "Hey {business_name}! We build software for Aussie businesses. Let's have a chat about how we can help?",
  ],
  
  service: [
    "Hey! We build software for Australian businesses. Found {business_name} and reckon we could help improve your operations. Let's chat?",
    "Hi! I'm Handy from HandyLabs.live - we've identified key areas where software can help your business. Worth a quick chat?",
    "Hey {business_name}! We build software for Aussie businesses. Let's have a chat about how we can help?",
  ],
  
  fitness: [
    "Hey! We build software for Australian businesses. Found {business_name} and reckon we could help improve your operations. Let's chat?",
    "Hi! I'm Handy from HandyLabs.live - we've identified key areas where software can help your business. Worth a quick chat?",
    "Hey {business_name}! We build software for Aussie businesses. Let's have a chat about how we can help?",
  ],
  
  general: [
    "Hey! We build software for Australian businesses. Found {business_name} and reckon we could help improve your operations. Let's chat?",
    "Hi! I'm Handy from HandyLabs.live - we've identified key areas where software can help your business. Worth a quick chat?",
    "Hey {business_name}! We build software for Aussie businesses. Let's have a chat about how we can help?",
  ],
  
  followUp: [
    "Hey! Just following up - still keen to help {business_name} with software. Let's chat?",
    "Hi again! Know you're busy but reckon we could help improve your operations. Worth a quick chat?",
    "Following up! Still got ideas for {business_name}. Free to discuss?",
  ],
};

export interface DMContext {
  businessName?: string;
  ownerName?: string;
  recentPost?: string;
  menuItem?: string;
  product?: string;
  dish?: string;
  service?: string;
  contentType?: string;
  recentAchievement?: string;
  recentWork?: string;
}

export function getPersonalizedDM(
  category: keyof typeof instagramDMTemplates,
  context: DMContext
): string {
  const templates = instagramDMTemplates[category];
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  // Replace placeholders
  let personalized = template;
  
  const replacements: Record<string, string | undefined> = {
    '{business_name}': context.businessName,
    '{name}': context.ownerName,
    '{recent_post}': context.recentPost,
    '{menu_item}': context.menuItem,
    '{product}': context.product,
    '{dish}': context.dish,
    '{service}': context.service,
    '{content_type}': context.contentType,
    '{recent_achievement}': context.recentAchievement,
    '{recent_work}': context.recentWork,
    '{class/workout}': 'class',
  };
  
  Object.entries(replacements).forEach(([placeholder, value]) => {
    if (value) {
      personalized = personalized.replace(placeholder, value);
    }
  });
  
  // Remove any remaining placeholders
  personalized = personalized.replace(/\{[^}]+\}/g, match => {
    // Extract just the word without braces for fallback
    return match.slice(1, -1).split('_').join(' ');
  });
  
  return personalized;
} 