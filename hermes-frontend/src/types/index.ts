export interface Lead {
  id: string;
  company: string;
  contact: string;
  email: string;
  source: 'cua' | 'linkedin' | 'scraper' | 'manual';
  status: 'new' | 'pending' | 'contacted' | 'qualified' | 'rejected';
  aiScore: number;
  industry: string;
  updatedAt: string;
}

export interface EmailDraft {
  id: string;
  to: string;
  toEmail: string;
  subject: string;
  status: 'draft' | 'approved' | 'sent' | 'rejected';
  aiScore: number;
  generatedAt: string;
}

export interface SearchResult {
  id: string;
  company: string;
  url: string;
  location: string;
  stage: string;
  employees: number;
  snippet: string;
  aiScore: number;
  source?: string;
  industry?: string;
}

export interface TaskStep {
  date: string;
  label: string;
  status: 'done' | 'active' | 'pending';
  detail?: string;
}

export interface AgentStatus {
  id?: string;
  name: string;
  type?: string;
  status: 'running' | 'idle' | 'active';
  description: string;
  logs: string[];
  tasksCompleted?: number;
  successRate?: number;
  lastRun?: string;
  taskSteps?: TaskStep[];
}

export interface FeedItem {
  time: string;
  event: string;
  message: string;
}

export interface PipelineStats {
  stage: string;
  count: number;
}
