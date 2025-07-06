export const instagramDMTemplates = {
  cafe: [
    "Hey! Your {recent_post} looks amazing 🤤 We help Melbourne cafes boost online orders. Mind if I share a quick idea?",
    "Love your coffee art! ☕ We build ordering apps for cafes - helped similar spots 2x their morning sales. Interested?",
    "Your {menu_item} caught my eye! 🔥 We create custom apps for Melb cafes. Worth a quick chat?",
  ],
  
  influencer: [
    "Hey {name}! Your {content_type} content is 🔥 Looking for Melbourne influencers to partner with. Interested?",
    "Love your vibe! We build apps/sites for businesses & offer 20% commission for referrals. Let's chat? 🚀",
    "Your {recent_achievement} was incredible! 👏 We're HandyLabs - keen to discuss a partnership?",
  ],
  
  boutique: [
    "Your {product} collection is stunning! 😍 We build e-commerce sites for Melb boutiques. Can I share some ideas?",
    "Hey! Love your style 🛍️ We help boutiques like yours sell online. Mind if I send some examples?",
    "Amazing curation! We create custom online stores for Melbourne boutiques. Interested in growing online?",
  ],
  
  restaurant: [
    "That {dish} looks incredible! 🍴 We build ordering systems for Melbourne restaurants. Worth exploring?",
    "Your menu is 🔥! We help restaurants streamline online orders. Can I share how?",
    "Love what you're doing! We create custom apps for Melb restaurants. Quick chat?",
  ],
  
  service: [
    "Hey! Your {service} looks professional 💼 We build booking systems for service businesses. Interested?",
    "Love your work! We help Melbourne businesses automate bookings. Mind if I share more?",
    "Great {recent_work}! 👏 We create custom tools for service providers. Let's connect?",
  ],
  
  fitness: [
    "Your {class/workout} looks intense! 💪 We build booking apps for fitness studios. Worth discussing?",
    "Love the energy! 🏃 We help gyms manage memberships & bookings online. Interested?",
    "Amazing transformation posts! We create custom apps for fitness businesses. Chat?",
  ],
  
  general: [
    "Hey {business_name}! Love what you're doing 👀 We help Melb businesses grow online. Interested?",
    "Your content is great! 🙌 We build custom digital solutions. Mind if I share some ideas?",
    "Impressive work! We're HandyLabs - we create apps/sites for local businesses. Let's chat?",
  ],
  
  followUp: [
    "Hey! Just floating this back up 😊 Still keen to help {business_name} grow online!",
    "Hi again! Know you're busy but genuinely think we could help. Worth a quick chat?",
    "Following up! 👋 Got some great ideas for {business_name}. Free to discuss?",
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