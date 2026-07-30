import React from 'react';
import { css } from 'styled-components';

/**
 * Icons for section-level headings.
 *
 * Every page used to define its own inline SVGs; these are shared so a heading
 * added later can reuse one instead of hand-rolling another copy. They inherit
 * `currentColor` and are sized by the heading's own `svg` rule, so they take the
 * colour and scale of wherever they're dropped.
 *
 * House style, matching the existing inline icons (e.g. ClockIcon in Schedules):
 * 24x24 viewBox, no fill, stroked at 1.8, round caps and joins.
 */

/**
 * Mix into a heading to give it an icon slot: lays the heading out as a row and
 * fixes the icon's size and colour so every section heading matches, whatever
 * font-size the heading itself uses.
 */
export const sectionIconSlot = css`
  display: flex;
  align-items: center;
  gap: 7px;
  svg {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.accent};
  }
`;

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** About / general information */
export const IconInfo = () => (
  <svg {...base}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="11" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
);

/** A lead's journey / timeline of stages */
export const IconJourney = () => (
  <svg {...base}><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.5 6H14a4 4 0 010 8H9a4 4 0 000 8h6.5" /></svg>
);

/** Tags / labels */
export const IconTag = () => (
  <svg {...base}><path d="M20.6 13.4l-6.1 6.1a2 2 0 01-2.9 0L3 10.7V3h7.7l8.9 8.9a2 2 0 010 1.5z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
);

/** AI analysis / generated insight */
export const IconSparkle = () => (
  <svg {...base}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /></svg>
);

/** A reply received */
export const IconReply = () => (
  <svg {...base}><polyline points="9 14 4 9 9 4" /><path d="M4 9h9a7 7 0 017 7v4" /></svg>
);

/** Sign out */
export const IconSignOut = () => (
  <svg {...base}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
);

/** Notifications */
export const IconBell = () => (
  <svg {...base}><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>
);

/** Template variables / code tokens */
export const IconBraces = () => (
  <svg {...base}><path d="M8 3H7a2 2 0 00-2 2v4a2 2 0 01-2 2 2 2 0 012 2v4a2 2 0 002 2h1" /><path d="M16 3h1a2 2 0 012 2v4a2 2 0 002 2 2 2 0 00-2 2v4a2 2 0 01-2 2h-1" /></svg>
);

/** Outbound mail (SMTP) */
export const IconSend = () => (
  <svg {...base}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
);

/** Inbound mail (IMAP) */
export const IconInbox = () => (
  <svg {...base}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.5 5.1L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.5-6.9A2 2 0 0016.8 4H7.2a2 2 0 00-1.7 1.1z" /></svg>
);

/** A single user / basic profile info */
export const IconUser = () => (
  <svg {...base}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);

/** Permissions / access control */
export const IconShield = () => (
  <svg {...base}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
);

/** Add a mailbox / new record */
export const IconMailPlus = () => (
  <svg {...base}><path d="M22 11.5V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h9" /><polyline points="22 6 12 13 2 6" /><line x1="18" y1="16" x2="18" y2="22" /><line x1="15" y1="19" x2="21" y2="19" /></svg>
);

/* ── Pipeline stages ── */
export const IconStageNew = () => (
  <svg {...base}><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
);
export const IconStageContacted = () => (
  <svg {...base}><path d="M4 4h16v12H7l-3 3z" /></svg>
);
export const IconStageReplied = () => (
  <svg {...base}><polyline points="9 14 4 9 9 4" /><path d="M4 9h9a7 7 0 017 7v4" /></svg>
);
export const IconStageQualified = () => (
  <svg {...base}><polyline points="20 6 9 17 4 12" /></svg>
);
export const IconStageRejected = () => (
  <svg {...base}><circle cx="12" cy="12" r="9" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
);

/** Today's agenda / day schedule */
export const IconAgenda = () => (
  <svg {...base}><rect x="3" y="4" width="18" height="17" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="8" y1="2" x2="8" y2="5" /><line x1="16" y1="2" x2="16" y2="5" /><line x1="8" y1="13" x2="14" y2="13" /><line x1="8" y1="17" x2="12" y2="17" /></svg>
);
