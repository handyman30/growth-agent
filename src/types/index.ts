export interface Lead {
  id?: string;
  source: 'instagram' | 'google' | 'email' | 'website';
  businessName: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  instagramHandle?: string;
  website?: string;
  address?: string;
  bio?: string;
  description?: string;
  followerCount?: number;
  rating?: number;
  reviewCount?: number;
  category: string; // Now dynamic - can be any category
  city: string; // Melbourne, Sydney, Adelaide, etc.
  location: string; // Full address
  recentPosts?: InstagramPost[];
  businessHours?: Record<string, string>;
  status: 'new' | 'contacted' | 'replied' | 'qualified' | 'hot_lead' | 'closed';
  lastContactedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InstagramPost {
  id: string;
  caption: string;
  imageUrl: string;
  likeCount: number;
  commentCount: number;
  postedAt: Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string; // Changed from specific union type to dynamic string
  variables: string[]; // e.g., ['businessName', 'recentPost', 'ownerName']
}

export interface OutreachMessage {
  leadId: string;
  type: 'email' | 'instagram_dm';
  subject?: string;
  content: string;
  status: 'draft' | 'sent' | 'failed' | 'opened' | 'replied';
  sentAt?: Date;
  openedAt?: Date;
  repliedAt?: Date;
}

export interface Campaign {
  id: string;
  name: string;
  targetCount: number;
  sentCount: number;
  openRate: number;
  replyRate: number;
  qualifiedLeads: number;
  createdAt: Date;
}

export interface SearchConfig {
  id: string;
  name: string;
  sources: ('instagram' | 'google')[];
  cities: string[];
  categories: string[];
  keywords: string[];
  maxResultsPerSearch: number;
  active: boolean;
  createdAt: Date;
}

export interface GooglePlace {
  placeId: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  types: string[];
  businessStatus?: string;
  hours?: Record<string, string>;
  priceLevel?: number;
} 