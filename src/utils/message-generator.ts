import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Lead, EmailTemplate } from '../types/index.js';
import { getTemplate } from '../templates/email-templates.js';
import { handleAPIError, logServiceError } from './error-handler.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generatePersonalizedEmail(
  lead: Lead,
  templateId: string
): Promise<{ subject: string; body: string }> {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  // Prepare context from lead data
  const context = {
    businessName: lead.businessName,
    ownerName: lead.ownerName || lead.businessName.split(' ')[0],
    instagramHandle: lead.instagramHandle,
    followerCount: lead.followerCount,
    bio: lead.bio,
    category: lead.category,
    recentPosts: lead.recentPosts || [],
  };

  const prompt = `You are helping personalize an email template for HandyLabs, a Melbourne-based company that builds software for Australian businesses.

Lead Information:
- Business: ${context.businessName}
- Owner: ${context.ownerName}
- Instagram: @${context.instagramHandle}
- Bio: ${context.bio}
- Category: ${context.category}
- Recent Posts: ${context.recentPosts.map(p => p.caption).join('; ')}

Template to personalize:
Subject: ${template.subject}
Body: ${template.body}

Instructions:
1. Replace all placeholders (in {brackets}) with specific, relevant information
2. Keep the tone direct, Australian, and no-nonsense
3. Focus on being straightforward - no spam, no fluff
4. Emphasize that we build software for Australian businesses
5. Keep it simple and to the point
6. Use Australian English and local references
7. Keep the same structure and key points as the template

Output the personalized email in this format:
SUBJECT: [personalized subject]
BODY: [personalized body]`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content || '';
    const subjectMatch = content.match(/SUBJECT:\s*(.+)/);
    const bodyMatch = content.match(/BODY:\s*([\s\S]+)/);

    if (!subjectMatch || !bodyMatch) {
      throw new Error('Failed to parse generated email');
    }

    return {
      subject: subjectMatch[1].trim(),
      body: bodyMatch[1].trim(),
    };
  } catch (error: any) {
    const serviceError = handleAPIError(error, 'OpenAI');
    logServiceError(serviceError);
    
    // If OpenAI fails, use fallback personalization
    console.log('📝 Using fallback template personalization');
    return fallbackPersonalization(lead, template);
  }
}

export async function generateInstagramDM(lead: Lead): Promise<string> {
  const prompt = `Generate a personalized Instagram DM for HandyLabs to send to an Australian business.

Business: ${lead.businessName}
Bio: ${lead.bio}
Category: ${lead.category}
Recent Post: ${lead.recentPosts?.[0]?.caption || 'No recent posts'}

Guidelines:
- Keep it under 150 characters (Instagram best practice)
- Be direct and Australian - no spam, no fluff
- Focus on software for Australian businesses
- Use casual, friendly tone with minimal emojis
- Keep it simple and straightforward
- Emphasize we build software for Aussie businesses

Example good DMs:
"Hey! We build software for Australian businesses. Found ${lead.businessName} and reckon we could help improve your operations. Let's chat?"
"Hi! I'm Handy from HandyLabs.live - we've identified key areas where software can help your business. Worth a quick chat?"`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 100,
    });

    return response.choices[0].message.content || generateFallbackDM(lead);
  } catch (error: any) {
    const serviceError = handleAPIError(error, 'OpenAI');
    logServiceError(serviceError);
    
    // Use fallback DM generation
    console.log('📝 Using fallback DM generation');
    return generateFallbackDM(lead);
  }
}

function fallbackPersonalization(lead: Lead, template: EmailTemplate): { subject: string; body: string } {
  let subject = template.subject;
  let body = template.body;

  // Basic replacements
  const replacements: Record<string, string> = {
    businessName: lead.businessName,
    ownerName: lead.ownerName || 'there',
    instagramHandle: lead.instagramHandle || '',
    recentPostDetail: lead.recentPosts?.[0]?.caption.slice(0, 50) || 'recent post',
    specificMenuItemOrFeature: 'offerings',
    contentTheme: lead.category,
    businessCategory: lead.category,
    mainBenefit: 'grow your online presence',
    originalSubject: template.subject.replace(/\{[^}]+\}/g, ''),
  };

  // Replace all placeholders
  Object.entries(replacements).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    subject = subject.replace(regex, value);
    body = body.replace(regex, value);
  });

  return { subject, body };
}

function generateFallbackDM(lead: Lead): string {
  const templates = [
    `Hey! We build software for Australian businesses. Found ${lead.businessName} and reckon we could help improve your operations. Let's chat?`,
    `Hi! I'm Handy from HandyLabs.live - we've identified key areas where software can help your business. Worth a quick chat?`,
    `Hey ${lead.businessName}! We build software for Aussie businesses. Let's have a chat about how we can help?`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
} 