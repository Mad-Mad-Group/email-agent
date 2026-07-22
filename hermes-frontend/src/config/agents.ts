/* ══════════════════════════════════════
   Shared Agent identity config
   Used across Dashboard, Leads, Email, Tasks
   ══════════════════════════════════════ */

export interface AgentIdentity {
  id: string;
  /** i18n key for display name */
  nameKey: string;
  /** i18n key for role type */
  typeKey: string;
  /** Pixel sprite sheet path */
  sprite: string;
  /** Number of animation frames in sprite sheet */
  frames: number;
  /** Frame width in px (sprite sheet width / frames) */
  frameW: number;
  /** Frame height in px */
  frameH: number;
  /** Brand color */
  accent: string;
  /** Light bg gradient start */
  bg1: string;
  /** Light bg gradient end */
  bg2: string;
}

export const AGENTS: Record<string, AgentIdentity> = {
  S1: {
    id: 'S1', nameKey: 'agents.s1Name', typeKey: 'agents.s1Type',
    sprite: '/assets/pixel-world/sprites/fox-idle.png', frames: 6, frameW: 48, frameH: 48,
    accent: '#f97316', bg1: '#fff7ed', bg2: '#ffedd5',
  },
  S2: {
    id: 'S2', nameKey: 'agents.s2Name', typeKey: 'agents.s2Type',
    sprite: '/assets/pixel-world/sprites/cow-idle.png', frames: 5, frameW: 48, frameH: 48,
    accent: '#64748b', bg1: '#f8fafc', bg2: '#f1f5f9',
  },
  S3: {
    id: 'S3', nameKey: 'agents.s3Name', typeKey: 'agents.s3Type',
    sprite: '/assets/pixel-world/sprites/chicken-idle.png', frames: 5, frameW: 48, frameH: 48,
    accent: '#ef4444', bg1: '#fef2f2', bg2: '#fee2e2',
  },
  S4: {
    id: 'S4', nameKey: 'agents.s4Name', typeKey: 'agents.s4Type',
    sprite: '/assets/pixel-world/sprites/duck-idle.png', frames: 4, frameW: 48, frameH: 48,
    accent: '#22c55e', bg1: '#f0fdf4', bg2: '#dcfce7',
  },
};

export const FARMER = {
  sprite: '/assets/pixel-world/sprites/farmer-village.png',
  frames: 4,
  frameW: 80,
  frameH: 80,
  accent: '#8b6914',
  nameKey: 'agents.farmer',
};

/** Map workflow step → responsible agent */
export const WORKFLOW_AGENT = {
  scrape: 'S1',   // Fox — data scraping
  analyze: 'S2',  // Cow — analysis & enrich
  draft: 'S3',    // Chicken — draft generation
  send: 'S4',     // Duck — email delivery
} as const;

/** Map Dashboard action card → agent */
export const DASHBOARD_CARD_AGENT = {
  pendingDrafts: 'S3',      // Draft鴨 — drafts pending approval
  newReplies: 'S4',         // 鴿速達 — replies to handle
  pendingMeetings: 'S2',    // 鷹析師 — meetings
  noReplyNoFollowup: 'S1',  // 蛛Sir — follow-up tracking
} as const;

/** Map lead source → agent (or farmer for manual) */
export const SOURCE_AGENT: Record<string, string | 'farmer'> = {
  scraper: 'S1',
  cua: 'S1',
  linkedin: 'S1',
  manual: 'farmer',
};

/** Map activity type → agent */
export const ACTIVITY_AGENT: Record<string, string> = {
  draft: 'S3',
  sent: 'S4',
  reply: 'S4',
};
