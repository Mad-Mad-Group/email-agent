import { AgentStatus, FeedItem } from '../types';

export const mockAgents: AgentStatus[] = [
  {
    name: 'CUA Search',
    status: 'running',
    description: 'Browser-based company discovery using AI navigation',
    logs: [
      '[10:30:12] Navigating to Crunchbase search...',
      '[10:30:18] Found 12 Series A companies in FinTech',
      '[10:30:25] Extracting company details for Vantage AI',
      '[10:30:31] Scoring lead: 93/100 — strong ICP match',
      '[10:30:38] Queuing 3 new leads for enrichment',
    ],
  },
  {
    name: 'Scraper',
    status: 'idle',
    description: 'Automated data extraction from company websites and directories',
    logs: [
      '[09:45:00] Batch scrape completed: 24 companies processed',
      '[09:44:30] Enriched contact data for 18 leads',
      '[09:43:15] Rate limit hit on LinkedIn — backing off 60s',
      '[09:42:00] Starting batch scrape: B2B SaaS directory',
    ],
  },
  {
    name: 'AI Analysis',
    status: 'running',
    description: 'Scores leads, generates email drafts, and refines targeting',
    logs: [
      '[10:31:00] Generating email draft for Rachel Kim (Frostbyte AI)',
      '[10:30:55] Lead scored: DataForge — 81/100',
      '[10:30:50] Updating pipeline stats: 3 new qualified leads',
      '[10:30:42] Analyzing industry signals for CleanTech sector',
      '[10:30:35] Email draft approved: Sarah Chen (Acme Corp) — score 94',
    ],
  },
];

export const mockFeed: FeedItem[] = [
  {
    time: '10:31:00',
    event: 'email_generated',
    message: 'AI drafted outreach email for Rachel Kim at Frostbyte AI',
  },
  {
    time: '10:30:55',
    event: 'lead_scored',
    message: 'DataForge scored 81/100 — added to pipeline',
  },
  {
    time: '10:30:50',
    event: 'pipeline_update',
    message: '3 leads moved to qualified stage',
  },
  {
    time: '10:30:38',
    event: 'leads_found',
    message: 'CUA Search discovered 3 new leads from Crunchbase',
  },
  {
    time: '10:30:35',
    event: 'email_approved',
    message: 'Email to Sarah Chen (Acme Corp) approved — score 94',
  },
  {
    time: '10:30:12',
    event: 'agent_started',
    message: 'CUA Search agent started new discovery session',
  },
  {
    time: '10:29:00',
    event: 'email_sent',
    message: 'Outreach email sent to Emily Watson at Meridian Health',
  },
  {
    time: '10:15:00',
    event: 'lead_rejected',
    message: 'CloudNine Systems rejected — low ICP fit (34/100)',
  },
  {
    time: '09:45:00',
    event: 'scrape_complete',
    message: 'Scraper batch completed: 24 companies processed, 18 enriched',
  },
  {
    time: '09:30:00',
    event: 'system',
    message: 'Hermes pipeline initialized — all agents online',
  },
];
