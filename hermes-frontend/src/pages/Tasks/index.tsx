import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes, css } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useTasks } from '../../api/hooks';
import { TaskItem } from '../../api/services';
import { media } from '../../styles/media';

/* ══════════════════════════════════════
   CMS Tasks — Luno jKanban Board style
   ══════════════════════════════════════ */

/* ── Inline SVG icon helper ── */

const I: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

/* ── Real API task fields (runtime shape, differs from TaskItem TS type) ──
   _id, task_id, title, skill_id, params, priority, deadline,
   status ("pending"|"completed"|"failed"), result (object|null),
   error (object {message}|null), _created_at, _updated_at,
   assigned_agent_id, _assigned_at
   ────────────────────────────────────────────────────────────── */

/* Safe field accessors — API shape may differ from TaskItem type */
function getField(task: TaskItem, key: string): unknown {
  return (task as unknown as Record<string, unknown>)[key];
}
function getStr(task: TaskItem, key: string): string {
  const v = getField(task, key);
  if (typeof v === 'string') return v;
  return '';
}
function getTitle(task: TaskItem): string {
  return getStr(task, 'title') || getStr(task, 'type') || 'Untitled Task';
}
function getSkill(task: TaskItem): string {
  return getStr(task, 'skill_id') || getStr(task, 'type') || '';
}
function getStatus(task: TaskItem): string {
  return (task.status ?? getStr(task, 'status') ?? 'pending').toLowerCase();
}
function getPriority(task: TaskItem): string {
  return getStr(task, 'priority') || 'normal';
}
function getCreatedAt(task: TaskItem): string {
  return getStr(task, '_created_at') || task.createdAt || '';
}
function getErrorMessage(task: TaskItem): string {
  const e = task.error ?? getField(task, 'error');
  if (!e) return '';
  if (typeof e === 'string') return e;
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as Record<string, unknown>).message);
  }
  return JSON.stringify(e);
}
function getResultSummary(task: TaskItem): string {
  const r = task.result ?? getField(task, 'result');
  if (!r) return '';
  if (typeof r === 'string') return r;
  if (typeof r === 'object' && r !== null) {
    const keys = Object.keys(r);
    return keys.slice(0, 2).map(k => `${k}: ${String((r as Record<string, unknown>)[k]).slice(0, 30)}`).join(', ');
  }
  return '';
}
function getParamsSummary(task: TaskItem): string {
  const p = getField(task, 'params') ?? task.payload;
  if (!p || typeof p !== 'object') return '';
  const obj = p as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 0) return '';
  return keys.slice(0, 2).map(k => {
    const v = obj[k];
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    return `${k}: ${s && s.length > 25 ? s.slice(0, 25) + '…' : s}`;
  }).join(', ');
}

/* ── Column config ── */

interface ColumnCfg { key: string; label: string; bg: string; }

const COLUMNS: ColumnCfg[] = [
  { key: 'pending',    label: 'Pending',    bg: '#3b82f6' },
  { key: 'processing', label: 'Processing', bg: '#d97706' },
  { key: 'completed',  label: 'Completed',  bg: '#16a34a' },
  { key: 'failed',     label: 'Failed',     bg: '#dc2626' },
];

/* ── Skill color palette ── */

const SKILL_COLORS: Record<string, string> = {
  S1: '#3b82f6', S2: '#d97706', S3: '#2563eb', S4: '#16a34a',
  scrape: '#3b82f6', email: '#d97706', analyze: '#2563eb',
};
function skillColor(id: string): string {
  if (SKILL_COLORS[id]) return SKILL_COLORS[id];
  const p = ['#3b82f6', '#d97706', '#2563eb', '#1d4ed8', '#dc2626', '#94a3b8'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return p[Math.abs(h) % p.length];
}

/* ── Avatar ── */

const AV_PALETTE = ['#bfdbfe', '#c4b5fd', '#a5f3fc', '#bbf7d0'];
function avColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return AV_PALETTE[Math.abs(h) % AV_PALETTE.length];
}
function initials(s: string): string {
  return s.split(/[\s@_-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

/* ── Safely extract tasks array from API response ── */

function extractTasks(data: unknown): TaskItem[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as Record<string, unknown>).data;
    if (Array.isArray(inner)) return inner;
  }
  return [];
}

/* ═══════════ Styled Components ═══════════ */

const Page = styled.div`
  display: flex; flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md}px;
`;

const Breadcrumb = styled.ol`
  list-style: none; margin: 0; padding: 0; display: flex;
  gap: ${({ theme }) => theme.spacing.sm}px;
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary};
  li + li::before { content: '/'; margin-right: ${({ theme }) => theme.spacing.sm}px; }
  a { color: ${({ theme }) => theme.colors.textSecondary}; text-decoration: none; }
`;

const Toolbar = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 12px;
`;

const TitleBlock = styled.div``;

const PageTitle = styled.h1`
  font-size: 1.15rem; font-weight: 600; margin: 0;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const PageSub = styled.small`
  color: ${({ theme }) => theme.colors.textTertiary}; font-size: 0.8125rem;
`;

const SearchWrap = styled.div`
  position: relative; display: flex; align-items: center;
  color: ${({ theme }) => theme.colors.textTertiary};
  svg { position: absolute; left: 10px; pointer-events: none; }
`;

const SearchInput = styled.input`
  padding: 8px 12px 8px 34px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.surface};
  font-size: 0.8125rem; font-family: ${({ theme }) => theme.fonts.primary};
  color: ${({ theme }) => theme.colors.textPrimary};
  width: 220px; outline: none;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  transition: border-color 0.15s, box-shadow 0.15s;
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; }
  &:hover:not(:focus) { border-color: ${({ theme }) => theme.colors.borderStrong}; }
  &:focus {
    border-color: ${({ theme }) => theme.colors.blue};
    box-shadow: 0 0 0 3px rgba(37,99,235,0.12), 0 1px 2px rgba(15,23,42,0.04);
  }
  ${media.mobile} { width: 100%; }
`;

/* ── Board ── */

const Board = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding-bottom: ${({ theme }) => theme.spacing.sm}px;
  min-height: 420px;
  ${media.tabletDown} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  ${media.mobile} {
    grid-template-columns: 1fr;
    gap: 0;
    border-radius: ${({ theme }) => theme.radii.card}px;
    box-shadow: ${({ theme }) => theme.shadows.card};
    min-height: auto;
  }
`;

const Col = styled.div`
  min-width: 0;
  display: flex; flex-direction: column;
  border-radius: ${({ theme }) => theme.radii.card}px;
  background: #f7f7f4;
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04);
  overflow: hidden;
  ${media.mobile} {
    border-radius: 0;
    box-shadow: none;
    overflow: visible;
  }
`;

const ColHead = styled.div<{ $bg: string; $collapsed?: boolean }>`
  padding: 12px ${({ theme }) => theme.spacing.md}px;
  background: ${({ $bg }) => $bg + '0a'};
  color: ${({ $bg }) => $bg};
  font-size: 0.875rem; font-weight: 600;
  display: flex; align-items: center; justify-content: space-between;
  ${media.mobile} {
    cursor: pointer;
    position: sticky;
    top: 64px;
    z-index: 5;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
`;

const ColChevron = styled.span<{ $open: boolean }>`
  display: none;
  ${media.mobile} {
    display: inline-flex;
    align-items: center;
    margin-left: 8px;
    transition: transform 0.2s ease;
    transform: rotate(${({ $open }) => $open ? '180deg' : '0deg'});
  }
`;

const ColCount = styled.span`
  font-size: 0.75rem; font-weight: 600;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  color: inherit;
  padding: 2px 8px; border-radius: 99px;
`;

const ColBody = styled.div<{ $collapsed?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm}px;
  display: flex; flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm}px;
  min-height: 60px; flex: 1;
  max-height: 600px; overflow-y: auto;
  ${media.mobile} {
    max-height: none;
    overflow-y: visible;
    transition: max-height 0.3s ease, padding 0.3s ease, opacity 0.2s ease;
    ${({ $collapsed }) => $collapsed && css`
      max-height: 0;
      min-height: 0;
      padding: 0 ${({ theme }: any) => theme.spacing.sm}px;
      opacity: 0;
      overflow: hidden;
    `}
  }
`;

/* ── Card ── */

const Card = styled.div`
  background: #ffffff;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.tile}px;
  padding: 12px ${({ theme }) => theme.spacing.md}px;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  transition: box-shadow 0.15s, transform 0.12s, border-color 0.15s;
  cursor: default;
  &:hover {
    box-shadow: 0 2px 8px rgba(15,23,42,0.07);
    transform: translateY(-1px);
  }
`;

const CardTitle = styled.div`
  font-size: 0.8125rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin-bottom: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

const CardDesc = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing.sm}px;
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
`;

const CardFooter = styled.div`
  display: flex; align-items: center;
  justify-content: space-between;
  gap: 6px;
`;

const CardMeta = styled.div`
  display: flex; align-items: center; gap: 6px;
`;

const Avatar = styled.span<{ $c: string }>`
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%;
  background: ${({ $c }) => $c};
  color: #334155; font-size: 0.5625rem; font-weight: 700;
  box-shadow: none;
`;

const Pill = styled.span<{ $c: string }>`
  display: inline-block; padding: 1px 8px;
  border-radius: 99px; font-size: 0.625rem; font-weight: 600;
  background: ${({ $c }) => $c}0d;
  color: ${({ $c }) => $c};
  border: 1px solid ${({ $c }) => $c}33;
`;

const PriorityDot = styled.span<{ $c: string }>`
  display: inline-block; width: 8px; height: 8px;
  border-radius: 50%;
  background: ${({ $c }) => $c};
  box-shadow: none;
`;

const CardDate = styled.span`
  font-size: 0.6875rem; color: ${({ theme }) => theme.colors.textTertiary};
`;

const ErrText = styled.span`
  color: ${({ theme }) => theme.colors.red};
  font-size: 0.6875rem; font-style: italic;
`;

const EmptyCol = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.lg}px ${({ theme }) => theme.spacing.sm}px;
  color: ${({ theme }) => theme.colors.textTertiary}; font-size: 0.8125rem;
`;

/* ── Footer ── */

const Footer = styled.footer`
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.md}px 0;
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textTertiary};
  a { color: ${({ theme }) => theme.colors.textSecondary}; text-decoration: none;
      margin-left: ${({ theme }) => theme.spacing.md}px; }
  a:hover { text-decoration: underline; }
`;

/* ── Helpers ── */

function fmtDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function priorityColor(p: string): string {
  switch (p) {
    case 'high': case 'urgent': return '#dc2626';
    case 'normal': return '#d97706';
    case 'low': return '#2563eb';
    default: return '#94a3b8';
  }
}

/* ═══════════ Mock data (demo padding) ═══════════ */

const MOCK_TASKS: TaskItem[] = [
  // ── Pending ──
  { _id: 'mock-p1', title: '抓取 LinkedIn 資料', skill_id: 'S1', params: { keyword: 'CTO', location: 'San Francisco' }, priority: 'high', status: 'pending', _created_at: '2026-06-23T08:15:00Z', assigned_agent_id: 'Agent-A' } as unknown as TaskItem,
  { _id: 'mock-p2', title: '批量寄送開發信', skill_id: 'S3', params: { template: 'intro_v2', batch_size: 50 }, priority: 'normal', status: 'pending', _created_at: '2026-06-23T09:30:00Z', assigned_agent_id: 'Agent-B' } as unknown as TaskItem,
  { _id: 'mock-p3', title: '分析競品定價頁面', skill_id: 'S2', params: { url: 'https://competitor.io/pricing' }, priority: 'low', status: 'pending', _created_at: '2026-06-22T14:00:00Z' } as unknown as TaskItem,
  { _id: 'mock-p4', title: '匯出本週 Leads 報表', skill_id: 'S5', params: { format: 'xlsx', range: 'this_week' }, priority: 'normal', status: 'pending', _created_at: '2026-06-24T06:00:00Z', assigned_agent_id: 'Agent-C' } as unknown as TaskItem,

  // ── Processing ──
  { _id: 'mock-r1', title: '爬取 Crunchbase 資料', skill_id: 'S1', params: { target: 'Series A startups', pages: 20 }, priority: 'high', status: 'processing', _created_at: '2026-06-24T07:45:00Z', assigned_agent_id: 'Worker-1' } as unknown as TaskItem,
  { _id: 'mock-r2', title: 'AI 分析潛在客戶匹配度', skill_id: 'S2', params: { model: 'lead-scorer-v3', batch: 120 }, priority: 'normal', status: 'processing', _created_at: '2026-06-24T08:10:00Z', assigned_agent_id: 'Worker-2' } as unknown as TaskItem,
  { _id: 'mock-r3', title: '同步 CRM 聯絡人', skill_id: 'S6', params: { crm: 'HubSpot', direction: 'bidirectional' }, priority: 'normal', status: 'processing', _created_at: '2026-06-24T09:00:00Z', assigned_agent_id: 'Worker-1' } as unknown as TaskItem,

  // ── Completed ──
  { _id: 'mock-c1', title: '寄送 TechCorp 開發信', skill_id: 'S3', params: { to: 'ceo@techcorp.com' }, priority: 'normal', status: 'completed', result: { sent: true, opened: true, replied: false }, _created_at: '2026-06-21T10:00:00Z', assigned_agent_id: 'Agent-A' } as unknown as TaskItem,
  { _id: 'mock-c2', title: '分析 Q2 轉換率數據', skill_id: 'S2', params: { quarter: 'Q2', metric: 'conversion' }, priority: 'low', status: 'completed', result: { analyzed: true, score: 87 }, _created_at: '2026-06-20T16:30:00Z', assigned_agent_id: 'Agent-B' } as unknown as TaskItem,
  { _id: 'mock-c3', title: '生成每日潛客摘要', skill_id: 'S4', params: { mode: 'daily_digest' }, priority: 'normal', status: 'completed', result: { leads_found: 34, qualified: 12 }, _created_at: '2026-06-22T06:00:00Z' } as unknown as TaskItem,
  { _id: 'mock-c4', title: '更新公司資料庫', skill_id: 'S5', params: { source: 'LinkedIn', records: 250 }, priority: 'normal', status: 'completed', result: { updated: 248, skipped: 2 }, _created_at: '2026-06-23T11:00:00Z', assigned_agent_id: 'Worker-2' } as unknown as TaskItem,

  // ── Failed ──
  { _id: 'mock-f1', title: '爬取 AngelList 頁面', skill_id: 'S1', params: { url: 'https://angel.co/companies' }, priority: 'high', status: 'failed', error: { message: 'Rate limit exceeded (429)' }, _created_at: '2026-06-23T13:00:00Z', assigned_agent_id: 'Worker-1' } as unknown as TaskItem,
  { _id: 'mock-f2', title: '寄信給 GlobalTech CEO', skill_id: 'S3', params: { to: 'john@globaltech.com' }, priority: 'normal', status: 'failed', error: { message: 'SMTP connection timeout' }, _created_at: '2026-06-22T15:20:00Z', assigned_agent_id: 'Agent-A' } as unknown as TaskItem,
  { _id: 'mock-f3', title: '同步 Salesforce 資料', skill_id: 'S6', params: { crm: 'Salesforce' }, priority: 'urgent', status: 'failed', error: { message: 'OAuth token expired, please re-authenticate' }, _created_at: '2026-06-24T04:30:00Z' } as unknown as TaskItem,
];

/* ═══════════ Workflow Steps (per task) ═══════════ */

interface WorkflowStep {
  label: string;
  status: 'done' | 'active' | 'pending';
  detail?: string;
  time?: string;
}

const TASK_WORKFLOWS: Record<string, WorkflowStep[]> = {
  'mock-p1': [
    { label: '任務已建立', status: 'done', time: '06/23 08:15' },
    { label: '等待排程分配', status: 'active', time: '06/23 08:16' },
    { label: '開始抓取 LinkedIn', status: 'pending' },
    { label: '資料清洗 & 去重', status: 'pending' },
    { label: '匯入潛客池', status: 'pending' },
  ],
  'mock-p2': [
    { label: '任務已建立', status: 'done', time: '06/23 09:30' },
    { label: '載入模板 intro_v2', status: 'active', time: '06/23 09:31', detail: '50 封信件待個性化生成' },
    { label: 'AI 生成信件內容', status: 'pending' },
    { label: '批量寄送', status: 'pending' },
    { label: '追蹤開信率', status: 'pending' },
  ],
  'mock-p3': [
    { label: '任務已建立', status: 'done', time: '06/22 14:00' },
    { label: '排隊中', status: 'active' },
    { label: '訪問定價頁面', status: 'pending' },
    { label: '截圖 & 提取定價', status: 'pending' },
    { label: '生成分析報告', status: 'pending' },
  ],
  'mock-p4': [
    { label: '任務已建立', status: 'done', time: '06/24 06:00' },
    { label: '查詢本週數據', status: 'active' },
    { label: '生成 XLSX', status: 'pending' },
    { label: '寄送至管理員', status: 'pending' },
  ],
  'mock-r1': [
    { label: '任務已建立', status: 'done', time: '06/24 07:45' },
    { label: '分配給 Worker-1', status: 'done', time: '06/24 07:46' },
    { label: '爬取 Crunchbase', status: 'active', time: '06/24 07:48', detail: '已抓取 12/20 頁，發現 87 家公司' },
    { label: '資料標準化', status: 'pending' },
    { label: '匯入管線', status: 'pending' },
  ],
  'mock-r2': [
    { label: '任務已建立', status: 'done', time: '06/24 08:10' },
    { label: '載入 lead-scorer-v3 模型', status: 'done', time: '06/24 08:12' },
    { label: '批次評分中', status: 'active', time: '06/24 08:15', detail: '已評分 78/120 筆，平均分 0.68' },
    { label: '生成報告', status: 'pending' },
  ],
  'mock-r3': [
    { label: '任務已建立', status: 'done', time: '06/24 09:00' },
    { label: '連接 HubSpot API', status: 'done', time: '06/24 09:02' },
    { label: '雙向同步中', status: 'active', time: '06/24 09:05', detail: '上傳 45 筆，下載 23 筆' },
    { label: '衝突檢查', status: 'pending' },
    { label: '同步完成確認', status: 'pending' },
  ],
  'mock-c1': [
    { label: '任務已建立', status: 'done', time: '06/21 10:00' },
    { label: 'AI 生成個性化信件', status: 'done', time: '06/21 10:05', detail: '主旨：Collaboration opportunity with TechCorp' },
    { label: '信件已寄出', status: 'done', time: '06/21 10:08' },
    { label: '已開信', status: 'done', time: '06/21 14:22', detail: '收件人已開信 (首次)' },
    { label: '等待回覆', status: 'done', time: '06/21 14:22', detail: '尚未回覆，3 天後自動跟進' },
  ],
  'mock-c2': [
    { label: '任務已建立', status: 'done', time: '06/20 16:30' },
    { label: '讀取 Q2 數據', status: 'done', time: '06/20 16:32' },
    { label: 'AI 分析完成', status: 'done', time: '06/20 16:40', detail: '轉換率評分: 87/100' },
    { label: '報告已生成', status: 'done', time: '06/20 16:42' },
  ],
  'mock-c3': [
    { label: '任務已建立', status: 'done', time: '06/22 06:00' },
    { label: '掃描所有來源', status: 'done', time: '06/22 06:05' },
    { label: '找到 34 筆潛客', status: 'done', time: '06/22 06:18', detail: '合格: 12, 待確認: 22' },
    { label: '摘要已寄出', status: 'done', time: '06/22 06:20' },
  ],
  'mock-c4': [
    { label: '任務已建立', status: 'done', time: '06/23 11:00' },
    { label: '匯入 LinkedIn 數據', status: 'done', time: '06/23 11:05' },
    { label: '更新 248 筆記錄', status: 'done', time: '06/23 11:30', detail: '跳過 2 筆 (重複)' },
    { label: '完成', status: 'done', time: '06/23 11:31' },
  ],
  'mock-f1': [
    { label: '任務已建立', status: 'done', time: '06/23 13:00' },
    { label: '分配給 Worker-1', status: 'done', time: '06/23 13:01' },
    { label: '開始爬取 AngelList', status: 'done', time: '06/23 13:03' },
    { label: '❌ 失敗: Rate limit exceeded (429)', status: 'done', time: '06/23 13:05', detail: '已重試 3 次，建議等待 1 小時後重試' },
  ],
  'mock-f2': [
    { label: '任務已建立', status: 'done', time: '06/22 15:20' },
    { label: '生成信件內容', status: 'done', time: '06/22 15:22' },
    { label: '❌ 寄送失敗: SMTP connection timeout', status: 'done', time: '06/22 15:25', detail: 'SMTP 伺服器無回應，請檢查網路設定' },
  ],
  'mock-f3': [
    { label: '任務已建立', status: 'done', time: '06/24 04:30' },
    { label: '❌ 連接失敗: OAuth token expired', status: 'done', time: '06/24 04:32', detail: '請重新授權 Salesforce 帳戶' },
  ],
};

function getWorkflowSteps(taskId: string, status: string): WorkflowStep[] {
  if (TASK_WORKFLOWS[taskId]) return TASK_WORKFLOWS[taskId];
  // Fallback generic workflow
  if (status === 'completed') {
    return [
      { label: '任務已建立', status: 'done' },
      { label: '處理中', status: 'done' },
      { label: '已完成', status: 'done' },
    ];
  }
  if (status === 'failed') {
    return [
      { label: '任務已建立', status: 'done' },
      { label: '❌ 執行失敗', status: 'done' },
    ];
  }
  if (status === 'processing') {
    return [
      { label: '任務已建立', status: 'done' },
      { label: '處理中', status: 'active' },
      { label: '待完成', status: 'pending' },
    ];
  }
  return [
    { label: '任務已建立', status: 'done' },
    { label: '等待排程', status: 'active' },
    { label: '開始執行', status: 'pending' },
    { label: '完成', status: 'pending' },
  ];
}

/* ═══════════ Floating Workflow Panel ═══════════ */

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const Overlay = styled.div`
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 1200;
  animation: ${fadeIn} 0.15s ease;
`;

const FloatingPanel = styled.div`
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1201; width: 460px; max-height: 80vh;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 14px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px ${({ theme }) => theme.colors.border};
  display: flex; flex-direction: column;
  animation: ${fadeIn} 0.2s ease;
  overflow: hidden;
  ${media.mobile} { width: calc(100vw - 32px); max-height: 90vh; }
`;

const PanelHead = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const PanelHeadLeft = styled.div`
  display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0;
`;

const PanelTitle = styled.h3`
  margin: 0; font-size: 15px; font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

const PanelSub = styled.span`
  font-size: 11px; color: ${({ theme }) => theme.colors.textTertiary};
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
`;

const CloseBtn = styled.button`
  background: none; border: none; cursor: pointer;
  width: 28px; height: 28px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: 18px; transition: background 0.15s;
  &:hover { background: ${({ theme }) => theme.colors.canvas}; color: ${({ theme }) => theme.colors.textPrimary}; }
`;

const WfBody = styled.div`
  padding: 20px; overflow-y: auto; flex: 1;
`;

const WfList = styled.ul`
  list-style: none; margin: 0; padding: 0; position: relative;
  /* Vertical connector line — centered on dot column (44px time + 12px gap + 6px half-dot = 62px) */
  &::before {
    content: ''; position: absolute; left: 61px;
    top: 18px; bottom: 18px; width: 2px;
    background: ${({ theme }) => theme.colors.blue};
    border-radius: 1px;
  }
`;

const pulseGlow = keyframes`
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.6; }
`;

const WfItem = styled.li<{ $s: 'done'|'active'|'pending' }>`
  display: flex; align-items: flex-start; gap: 12px;
  padding: 8px 0; position: relative;
  transition: opacity 0.2s;
  ${({ $s }) => $s === 'pending' && css`opacity: 0.45;`}
`;

const WfTime = styled.span`
  width: 44px; flex-shrink: 0;
  font-size: 10px; font-weight: 600;
  color: ${({ theme }) => theme.colors.textTertiary};
  text-align: right; padding-top: 3px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  line-height: 1;
`;

const WfDot = styled.div<{ $s: 'done'|'active'|'pending' }>`
  width: 14px; height: 14px; border-radius: 50%;
  flex-shrink: 0; margin-top: 1px; position: relative; z-index: 1;
  background: ${({ $s, theme }) =>
    $s === 'done' ? theme.colors.green :
    $s === 'active' ? theme.colors.blue :
    theme.colors.border};
  border: 2px solid ${({ $s, theme }) =>
    $s === 'done' ? theme.colors.green :
    $s === 'active' ? theme.colors.blue :
    theme.colors.border};
  box-sizing: border-box;
  ${({ $s }) => $s === 'active' && css`
    animation: ${pulseGlow} 2s ease-in-out infinite;
    background: ${({ theme }: any) => theme.colors.blue};
  `}
  ${({ $s }) => $s === 'done' && css`
    &::after {
      content: ''; position: absolute; left: 3px; top: 1px;
      width: 4px; height: 7px;
      border: solid #fff; border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
  `}
  ${({ $s }) => $s === 'pending' && css`
    background: ${({ theme }: any) => theme.colors.surface};
    border: 2px solid ${({ theme }: any) => theme.colors.border};
  `}
`;

const WfContent = styled.div`flex: 1; min-width: 0;`;

const WfLabel = styled.div<{ $s?: 'done'|'active'|'pending' }>`
  font-size: 13px; font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary}; line-height: 1.4;
  ${({ $s }) => $s === 'active' && css`font-weight: 600;`}
`;

const WfDetail = styled.div`
  font-size: 11px; color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 4px; line-height: 1.5; padding: 8px 10px;
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: 8px; border-left: 3px solid ${({ theme }) => theme.colors.blue};
`;

const PanelFoot = styled.div`
  padding: 12px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex; justify-content: space-between; align-items: center;
`;

const FootStat = styled.span`
  font-size: 11px; color: ${({ theme }) => theme.colors.textTertiary};
`;

const ProgWrap = styled.div`
  display: flex; align-items: center; gap: 8px;
`;

const ProgTrack = styled.div`
  width: 120px; height: 6px;
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: 3px; overflow: hidden;
`;

const ProgFill = styled.div<{ $pct: number }>`
  height: 100%; width: ${({ $pct }) => $pct}%;
  background: ${({ theme }) => theme.colors.blue};
  border-radius: 3px; transition: width 0.4s ease;
`;

const ProgPct = styled.span`
  font-size: 11px; font-weight: 600;
  color: ${({ theme }) => theme.colors.green};
`;

/* ═══════════ Component ═══════════ */

const Tasks: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [collapsedCols, setCollapsedCols] = useState<Set<string>>(() => {
    // On mobile, default collapse all except 'pending'
    return new Set(['processing', 'completed', 'failed']);
  });
  const toggleCol = useCallback((key: string) => {
    setCollapsedCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const handleClose = useCallback(() => setSelectedTask(null), []);
  const { data, isLoading } = useTasks();
  const apiTasks = extractTasks(data);
  const tasks = [...apiTasks, ...MOCK_TASKS];

  const translatedColumns = useMemo(() => COLUMNS.map(col => ({
    ...col,
    label: t(`tasks.${col.key}`),
  })), [t]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      const title = getTitle(t).toLowerCase();
      const skill = getSkill(t).toLowerCase();
      const status = getStatus(t);
      const id = t._id.toLowerCase();
      return title.includes(q) || skill.includes(q) || status.includes(q) || id.includes(q);
    });
  }, [tasks, search]);

  const grouped = useMemo(() => {
    const m: Record<string, TaskItem[]> = {};
    for (const c of COLUMNS) m[c.key] = [];
    for (const t of filtered) {
      const s = getStatus(t);
      if (m[s]) m[s].push(t);
      else m['pending'].push(t);
    }
    return m;
  }, [filtered]);

  return (
    <Page>
      <Toolbar>
        <SearchWrap>
          <I size={14}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </I>
          <SearchInput
            type="text"
            placeholder={t('tasks.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </SearchWrap>
      </Toolbar>

      <Board>
        {translatedColumns.map((col) => {
          const items = grouped[col.key] ?? [];
          const isCollapsed = collapsedCols.has(col.key);
          return (
            <Col key={col.key}>
              <ColHead $bg={col.bg} $collapsed={isCollapsed} onClick={() => toggleCol(col.key)}>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {col.label}
                  <ColChevron $open={!isCollapsed}>
                    <I size={14}><polyline points="6 9 12 15 18 9" /></I>
                  </ColChevron>
                </span>
                <ColCount>{String(items.length)}</ColCount>
              </ColHead>
              <ColBody $collapsed={isCollapsed}>
                {isLoading ? (
                  <EmptyCol>{t('tasks.loading')}</EmptyCol>
                ) : items.length === 0 ? (
                  <EmptyCol>{t('tasks.noTasks')}</EmptyCol>
                ) : (
                  items.map((task) => {
                    const title = getTitle(task);
                    const skill = getSkill(task);
                    const status = getStatus(task);
                    const priority = getPriority(task);
                    const created = getCreatedAt(task);
                    const errMsg = getErrorMessage(task);
                    const paramStr = getParamsSummary(task);
                    const resultStr = getResultSummary(task);
                    const agentId = getStr(task, 'assigned_agent_id');

                    // Description: show error for failed, result for completed, params otherwise
                    let desc = paramStr || t('tasks.noDetails');
                    if (status === 'failed' && errMsg) desc = errMsg;
                    else if (status === 'completed' && resultStr) desc = resultStr;

                    const assignee = agentId || t('tasks.system');

                    return (
                      <Card key={task._id} onClick={() => setSelectedTask(task)} style={{ cursor: 'pointer' }}>
                        <CardTitle>{title}</CardTitle>
                        <CardDesc>
                          {status === 'failed' ? <ErrText>{desc}</ErrText> : desc}
                        </CardDesc>
                        <CardFooter>
                          <CardMeta>
                            <Avatar $c={avColor(assignee)}>{initials(assignee)}</Avatar>
                            {skill && <Pill $c={skillColor(skill)}>{skill}</Pill>}
                            <PriorityDot $c={priorityColor(priority)} title={priority} />
                          </CardMeta>
                          <CardDate>{fmtDate(created)}</CardDate>
                        </CardFooter>
                      </Card>
                    );
                  })
                )}
              </ColBody>
            </Col>
          );
        })}
      </Board>

      <Footer>
        <span>{t('footer.copyrightHermes', { year: 2024 })}</span>
        <div>
          <a href="#">{t('footer.documentation')}</a>
          <a href="#">{t('footer.support')}</a>
          <a href="#">{t('footer.faqs')}</a>
        </div>
      </Footer>

      {/* ── Floating Workflow Panel (portal to body) ── */}
      {selectedTask && createPortal((() => {
        const title = getTitle(selectedTask);
        const skill = getSkill(selectedTask);
        const status = getStatus(selectedTask);
        const steps = getWorkflowSteps(selectedTask._id, status);
        const doneCount = steps.filter(s => s.status === 'done').length;
        const pct = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;

        return (
          <>
            <Overlay onClick={handleClose} />
            <FloatingPanel>
              <PanelHead>
                <PanelHeadLeft>
                  <PanelTitle>{title}</PanelTitle>
                  <PanelSub>{skill && `${skill} · `}{status}</PanelSub>
                </PanelHeadLeft>
                <CloseBtn onClick={handleClose} title="Close">×</CloseBtn>
              </PanelHead>

              <WfBody>
                <WfList>
                  {steps.map((step, i) => (
                    <WfItem key={i} $s={step.status}>
                      <WfTime>{step.time || ''}</WfTime>
                      <WfDot $s={step.status} />
                      <WfContent>
                        <WfLabel $s={step.status}>{step.label}</WfLabel>
                        {step.detail && <WfDetail>{step.detail}</WfDetail>}
                      </WfContent>
                    </WfItem>
                  ))}
                </WfList>
              </WfBody>

              <PanelFoot>
                <FootStat>{doneCount} / {steps.length} steps</FootStat>
                <ProgWrap>
                  <ProgTrack><ProgFill $pct={pct} /></ProgTrack>
                  <ProgPct>{pct}%</ProgPct>
                </ProgWrap>
              </PanelFoot>
            </FloatingPanel>
          </>
        );
      })(), document.body)}
    </Page>
  );
};

export default Tasks;
