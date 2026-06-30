import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes, css } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../../api/hooks';
import { SearchPayload } from '../../api/services';
import { sseClient, SSEEvent } from '../../api/sse';
import { leadsApi, Lead } from '../../api/leads';
import { media } from '../../styles/media';

/* ══════════════════════════════════════
   CMS Search — LUNO-style UI
   ══════════════════════════════════════ */

/* ── Layout primitives ── */

const Page = styled.div`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing.md}px;`;

const Breadcrumb = styled.ol`
  list-style: none; margin: 0; padding: 0; display: flex; gap: ${({ theme }) => theme.spacing.sm}px;
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary};
  li + li::before { content: '/'; margin-right: ${({ theme }) => theme.spacing.sm}px; }
  a { color: ${({ theme }) => theme.colors.textSecondary}; text-decoration: none; }
`;

const ToolbarRow = styled.div`
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
`;

const PageTitle = styled.h1`
  font-size: 1.15rem; font-weight: 600; margin: 4px 0 0;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const PageSub = styled.small`
  color: ${({ theme }) => theme.colors.textTertiary}; font-size: 0.8125rem;
`;

/* ── Card ── */

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const CardBody = styled.div`padding: ${({ theme }) => theme.spacing.md}px;`;

/* ── Form ── */

const Form = styled.form`
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: ${({ theme }) => theme.spacing.md}px;
  ${media.tabletDown} { grid-template-columns: 1fr 1fr; }
  ${media.mobile} { grid-template-columns: 1fr; }
`;

const FormGroup = styled.div`display: flex; flex-direction: column; gap: 4px;`;

const Label = styled.label`
  font-size: 0.75rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase; letter-spacing: 0.04em;
`;

const Input = styled.input`
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-size: 0.8125rem; outline: none;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.surface};
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; }
  &:focus { border-color: ${({ theme }) => theme.colors.blue}; }
`;

const BtnRow = styled.div`
  display: flex; align-items: flex-end;
  ${media.tabletDown} { grid-column: 1 / -1; }
`;

const PrimaryBtn = styled.button`
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border: none; border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.blue}; color: #fff;
  font-size: 0.8125rem; font-weight: 600; cursor: pointer;
  white-space: nowrap; display: inline-flex; align-items: center; gap: 6px;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  ${media.mobile} { width: 100%; justify-content: center; }
`;

const Spinner = styled.span`
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid currentColor; border-top-color: transparent;
  border-radius: 50%; animation: spin 0.7s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

/* ── Results ── */

const Divider = styled.hr`
  margin: 0; border: none; border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const StatusBanner = styled.div<{ $type: 'success' | 'error' | 'loading' }>`
  display: flex; align-items: center; gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-size: 0.8125rem; font-weight: 500;
  background: ${({ $type, theme }) =>
    $type === 'success' ? `${theme.colors.green}22`
    : $type === 'error' ? `${theme.colors.red}22`
    : `${theme.colors.blue}22`};
  color: ${({ $type, theme }) =>
    $type === 'success' ? theme.colors.green
    : $type === 'error' ? theme.colors.red
    : theme.colors.blue};
`;

const TableWrap = styled.div`overflow-x: auto;`;

const Table = styled.table`
  width: 100%; border-collapse: collapse; font-size: 0.8125rem;
  th, td {
    padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
    text-align: left; white-space: nowrap;
  }
  th {
    font-weight: 600; text-transform: uppercase; font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.textTertiary};
    border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  }
`;

const TRow = styled.tr<{ $even?: boolean }>`
  background: ${({ $even, theme }) => $even ? theme.colors.surfaceMuted : theme.colors.surface};
  &:hover { background: ${({ theme }) => theme.colors.surfaceMuted}; }
  td { border-bottom: 1px solid ${({ theme }) => theme.colors.border}; }
  cursor: pointer;
`;

const PreBlock = styled.pre`
  margin: 0; padding: ${({ theme }) => theme.spacing.md}px;
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textPrimary};
  overflow-x: auto; white-space: pre-wrap; word-break: break-all;
`;

const EmptyState = styled.div`
  padding: ${({ theme }) => theme.spacing.xl}px;
  text-align: center; color: ${({ theme }) => theme.colors.textTertiary}; font-size: 0.875rem;
`;

/* ── Result Cards ── */

const ResultCardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  max-height: 480px;
  overflow-y: auto;
  padding-right: 4px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: ${({ theme }) => theme.colors.border}; border-radius: 2px; }
`;

const ResultCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    border-color: #5699a3;
    box-shadow: 0 2px 8px rgba(86,153,163,0.1);
    transform: translateY(-1px);
  }
`;

const RcAvatar = styled.div<{ $color: string }>`
  width: 36px; height: 36px;
  border-radius: 8px;
  background: ${({ $color }) => $color};
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8125rem; font-weight: 700;
  flex-shrink: 0;
`;

const RcBody = styled.div`
  flex: 1; min-width: 0;
`;

const RcTopRow = styled.div`
  display: flex; align-items: center; gap: 8px; margin-bottom: 2px;
`;

const RcName = styled.span`
  font-size: 0.875rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

const RcStars = styled.span`
  color: #f4b400; font-size: 0.6875rem; flex-shrink: 0;
`;

const RcRatingText = styled.span`
  font-size: 0.6875rem; color: ${({ theme }) => theme.colors.textTertiary}; flex-shrink: 0;
`;

const RcMeta = styled.div`
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textSecondary};
  display: flex; align-items: center; gap: 4px;
  margin-bottom: 4px;
`;

const RcPhone = styled.span`
  font-size: 0.75rem; color: #5699a3; font-weight: 500;
`;

const RcStatusBadge = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  flex-shrink: 0;
  background: ${({ $status }) =>
    $status === 'qualified' ? '#5699a322' :
    $status === 'contacted' ? '#d4c8c022' :
    $status === 'rejected' ? '#d4bbb522' :
    '#7fb5ba22'};
  color: ${({ $status }) =>
    $status === 'qualified' ? '#5699a3' :
    $status === 'contacted' ? '#a89490' :
    $status === 'rejected' ? '#c44' :
    '#7fb5ba'};
`;

const RcActions = styled.div`
  display: flex; flex-direction: column; align-items: flex-end;
  gap: 6px; flex-shrink: 0;
`;

const RcSmallBtn = styled.button`
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    border-color: #5699a3;
    color: #5699a3;
  }
`;

/* ── Search form icon ── */

const InputWrap = styled.div`
  position: relative;
  svg {
    position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.textTertiary}; pointer-events: none;
  }
`;

const InputWithIcon = styled(Input)`
  padding-left: 32px;
`;

/* ── Stats bar ── */

const StatsBar = styled.div`
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
`;

const StatChip = styled.div`
  display: flex; align-items: center; gap: 6px;
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textSecondary};
`;

const StatDot = styled.span<{ $color: string }>`
  width: 8px; height: 8px; border-radius: 50%; background: ${({ $color }) => $color};
`;

/* ── Filter bar ── */

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
  padding: 10px 12px;
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: 8px;
`;

const FilterToggle = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 99px;
  border: 1px solid ${({ $active }) => $active ? '#5699a3' : 'transparent'};
  background: ${({ $active }) => $active ? '#5699a322' : 'transparent'};
  color: ${({ $active, theme }) => $active ? '#5699a3' : theme.colors.textSecondary};
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: #5699a3; color: #5699a3; }
`;

const FilterDivider = styled.span`
  width: 1px;
  height: 18px;
  background: ${({ theme }) => theme.colors.border};
  margin: 0 2px;
`;

const FilterLabel = styled.span`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-weight: 500;
  white-space: nowrap;
`;

const RatingSlider = styled.input`
  width: 80px;
  height: 4px;
  appearance: none;
  background: ${({ theme }) => theme.colors.border};
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  &::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #5699a3;
    cursor: pointer;
  }
`;

const SourceChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 99px;
  border: 1px solid ${({ $active }) => $active ? '#5699a3' : 'transparent'};
  background: ${({ $active }) => $active ? '#5699a322' : 'transparent'};
  color: ${({ $active, theme }) => $active ? '#5699a3' : theme.colors.textSecondary};
  font-size: 0.625rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: #5699a3; }
`;

/* ── Contact info icons on card ── */

const RcContactIcons = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
`;

const ContactIcon = styled.span<{ $has: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.625rem;
  color: ${({ $has }) => $has ? '#5699a3' : '#ccc'};
  svg { opacity: ${({ $has }) => $has ? 1 : 0.4}; }
`;

/* ── Inline SVG ── */

const SvgIcon = ({ d, size = 14 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/* ── Footer ── */

const Footer = styled.footer`
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.md}px 0;
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textTertiary};
  a { color: ${({ theme }) => theme.colors.textSecondary}; text-decoration: none; margin-left: ${({ theme }) => theme.spacing.md}px; }
  a:hover { text-decoration: underline; }
`;

/* ── Detail Panel ── */

const dpFadeIn = keyframes`
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;

const DpOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1200;
`;

const DpPanel = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1201;
  width: 500px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22);
  animation: ${dpFadeIn} 0.2s ease-out;
  ${media.mobile} { width: 95%; }
`;

const DpHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const DpHeaderInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DpTitle = styled.h2`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const DpTypeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: #5699a322;
  color: #5699a3;
`;

const DpCloseBtn = styled.button`
  background: none;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textTertiary};
  padding: 4px;
  &:hover { color: ${({ theme }) => theme.colors.textPrimary}; }
`;

const DpBody = styled.div`
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const DpGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  ${media.mobile} { grid-template-columns: 1fr; }
`;

const DpField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const DpFieldLabel = styled.span`
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const DpFieldValue = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  word-break: break-word;
`;

const DpSectionTitle = styled.h3`
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

const DpPreviewBox = styled.div`
  padding: 14px 16px;
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const DpRelatedItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const DpRelatedIcon = styled.span`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
`;

const DpFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const DpActionBtn = styled.button<{ $variant?: 'primary' | 'default' }>`
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
  background: ${({ $variant, theme }) =>
    $variant === 'primary' ? theme.colors.blue : theme.colors.surfaceMuted};
  color: ${({ $variant }) =>
    $variant === 'primary' ? '#fff' : 'inherit'};
  &:hover { opacity: 0.85; }
`;

/* ── Results + Browser split ── */

const SplitRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: start;
  ${media.mobile} { grid-template-columns: 1fr; }
`;

const ResultPane = styled.div`
  min-width: 0;
`;

/* ── Browser Preview ── */

const BrowserFrame = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 10px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const BrowserChrome = styled.div`
  background: #f0f0f0;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #ddd;
`;

const BrowserDots = styled.div`
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
`;

const BrowserAddressBar = styled.div`
  flex: 1;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 10px;
  color: #666;
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const BrowserTabs = styled.div`
  display: flex;
  gap: 1px;
  padding: 4px 10px 0;
  background: #e8e8e8;
`;

const BrowserTab = styled.div<{ $active?: boolean }>`
  padding: 4px 12px;
  font-size: 9px;
  border-radius: 4px 4px 0 0;
  background: ${({ $active }) => $active ? '#f0f0f0' : '#ddd'};
  color: ${({ $active }) => $active ? '#333' : '#888'};
  font-weight: ${({ $active }) => $active ? 600 : 400};
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const BrowserBody = styled.div`
  height: 260px;
  background: #fff;
  overflow: hidden;
  position: relative;
  font-size: 11px;
`;

const blinkCursor = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

const scanLine = keyframes`
  0% { top: 0; }
  100% { top: 100%; }
`;

const ScanOverlay = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(86,153,163,0.4), transparent);
  animation: ${scanLine} 3s ease-in-out infinite;
  z-index: 2;
  pointer-events: none;
`;

/* Mock Google Maps results page */
const MockPage = styled.div`
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const MockSearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: #f8f8f8;
  border: 1px solid #ddd;
  border-radius: 20px;
  margin-bottom: 4px;
`;

const MockSearchIcon = styled.span`
  font-size: 10px;
  color: #999;
`;

const MockSearchText = styled.span`
  font-size: 10px;
  color: #333;
  font-weight: 500;
`;

const MockResult = styled.div<{ $highlighted?: boolean }>`
  padding: 6px 8px;
  border-radius: 4px;
  border-left: 2px solid transparent;
  ${({ $highlighted }) => $highlighted && css`
    background: rgba(86,153,163,0.08);
    border-left-color: #5699a3;
  `}
`;

const MockResultName = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: #1a0dab;
`;

const MockResultMeta = styled.div`
  font-size: 9px;
  color: #666;
  margin-top: 1px;
`;

const MockResultSnippet = styled.div`
  font-size: 9px;
  color: #444;
  margin-top: 2px;
`;

const MockStars = styled.span`
  color: #f4b400;
  font-size: 8px;
`;

/* Agent activity log */
const AgentLog = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: 8px 10px;
  max-height: 120px;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.canvas};
`;

const AgentLogTitle = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const pulseAgent = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`;

const AgentDot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #10b981;
  animation: ${pulseAgent} 1.5s ease-in-out infinite;
`;

const LogLine = styled.div`
  font-size: 9px;
  font-family: 'JetBrains Mono', monospace;
  color: ${({ theme }) => theme.colors.textTertiary};
  padding: 1px 0;
  line-height: 1.5;
`;

const LogTime = styled.span`
  color: ${({ theme }) => theme.colors.blue};
  margin-right: 6px;
`;

const LogUrl = styled.span`
  color: #5699a3;
`;

/* ── Pipeline Progress ── */

const PipelineSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
`;

const ProgressBarOuter = styled.div`
  width: 100%;
  height: 8px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressBarInner = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: #5699a3;
  border-radius: 4px;
  transition: width 0.4s ease;
`;

const PipelineStageLabel = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PipelineLogFeed = styled.div`
  max-height: 200px;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: ${({ theme }) => theme.radii.control}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 8px 10px;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.6875rem;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: ${({ theme }) => theme.colors.border}; border-radius: 2px; }
`;

const PipelineLogLine = styled.div<{ $level?: string }>`
  padding: 2px 0;
  line-height: 1.6;
  color: ${({ $level, theme }) =>
    $level === 'error' ? theme.colors.red
    : $level === 'warn' ? '#f59e0b'
    : theme.colors.textSecondary};
`;

const PipelineLogTime = styled.span`
  color: ${({ theme }) => theme.colors.blue};
  margin-right: 6px;
`;

const PipelineLogStage = styled.span`
  color: #5699a3;
  font-weight: 600;
  margin-right: 6px;
`;

const STAGE_LABELS: Record<string, string> = {
  search: '搜尋中',
  'search→enrich': '開始充實資料',
  enrich: '充實資料中',
  analyze: '分析中',
  draft: '撰寫郵件中',
  send: '處理發送中',
  pipeline: '處理中',
  complete: '完成',
};

/* ── Helpers ── */

function isArrayOfObjects(val: unknown): val is Record<string, unknown>[] {
  return Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0] !== null;
}

function renderResults(data: unknown, onRowClick?: (row: Record<string, unknown>) => void) {
  if (data === null || data === undefined) return null;
  if (isArrayOfObjects(data)) {
    const rows = data as Record<string, unknown>[];
    const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    return (
      <TableWrap>
        <Table>
          <thead>
            <tr>{cols.map(col => <th key={col}>{col}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <TRow key={i} $even={i % 2 === 1} onClick={() => onRowClick?.(row)}>
                {cols.map(col => (
                  <td key={col}>
                    {row[col] === null || row[col] === undefined
                      ? '—'
                      : typeof row[col] === 'object'
                      ? JSON.stringify(row[col])
                      : String(row[col])}
                  </td>
                ))}
              </TRow>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    );
  }
  return <PreBlock>{JSON.stringify(data, null, 2)}</PreBlock>;
}

/* ── Component ── */

/* ── Detail panel helpers ── */

const TYPE_COLORS: Record<string, string> = {
  business: '#5699a3',
  person: '#7fb5ba',
  place: '#d4c8c0',
  default: '#5699a3',
};

function getResultTitle(row: Record<string, unknown>): string {
  const candidates = ['name', 'title', 'company_name', 'company', 'business_name', 'label'];
  for (const key of candidates) {
    if (row[key] && typeof row[key] === 'string') return row[key] as string;
  }
  const firstString = Object.values(row).find(v => typeof v === 'string' && (v as string).length > 0);
  return firstString ? String(firstString) : 'Result';
}

function getResultType(row: Record<string, unknown>): string {
  const candidates = ['type', 'category', 'source', 'kind'];
  for (const key of candidates) {
    if (row[key] && typeof row[key] === 'string') return row[key] as string;
  }
  return 'result';
}

function getResultPreview(row: Record<string, unknown>): string {
  const candidates = ['description', 'snippet', 'content', 'summary', 'text', 'address', 'details'];
  for (const key of candidates) {
    if (row[key] && typeof row[key] === 'string') return row[key] as string;
  }
  return JSON.stringify(row, null, 2);
}

const MOCK_RELATED = [
  { title: 'Similar result in nearby area', type: 'location', color: '#5699a3' },
  { title: 'Related business listing', type: 'business', color: '#7fb5ba' },
  { title: 'Matching industry entry', type: 'industry', color: '#d4c8c0' },
];

/* ── Mock search results (displayed by default) ── */

interface MockLead {
  name: string;
  phone: string;
  address: string;
  rating: number;
  reviews: number;
  source: string;
  status: string;
  color: string;
  hasEmail: boolean;
  hasPhone: boolean;
  hasWebsite: boolean;
  email?: string;
  website?: string;
}

const MOCK_SEARCH_RESULTS: MockLead[] = [
  { name: '宏達水電行', phone: '02-2720-1234', address: '台北市信義區松仁路100號', rating: 4.5, reviews: 128, source: 'Google Maps', status: 'new', color: '#5699a3', hasEmail: true, hasPhone: true, hasWebsite: true, email: 'info@hongda.com.tw', website: 'hongda.com.tw' },
  { name: '永豐水電工程', phone: '02-2705-5678', address: '台北市大安區復興南路200號', rating: 4.2, reviews: 85, source: 'Google Maps', status: 'new', color: '#7fb5ba', hasEmail: false, hasPhone: true, hasWebsite: false },
  { name: '大同水電維修', phone: '02-2562-9012', address: '台北市中山區南京東路50號', rating: 4.8, reviews: 203, source: 'Google Maps', status: 'contacted', color: '#d4c8c0', hasEmail: true, hasPhone: true, hasWebsite: true, email: 'service@datong-water.tw', website: 'datong-water.tw' },
  { name: '建成水電服務', phone: '02-2302-3456', address: '台北市萬華區西園路88號', rating: 3.9, reviews: 42, source: 'LinkedIn', status: 'new', color: '#4a6fa5', hasEmail: true, hasPhone: true, hasWebsite: false, email: 'jiancheng.plumb@gmail.com' },
  { name: '信義水電急修', phone: '02-2579-7890', address: '台北市松山區八德路300號', rating: 4.6, reviews: 156, source: 'Google Maps', status: 'qualified', color: '#5699a3', hasEmail: true, hasPhone: true, hasWebsite: true, email: 'contact@xinyi-fix.com', website: 'xinyi-fix.com' },
  { name: '台北水電到府', phone: '02-2771-2345', address: '台北市大安區忠孝東路四段120號', rating: 4.1, reviews: 67, source: 'LinkedIn', status: 'new', color: '#d4bbb5', hasEmail: false, hasPhone: true, hasWebsite: true, website: 'taipei-plumber.tw' },
  { name: '全能水電工程行', phone: '02-2391-6789', address: '台北市中正區重慶南路一段80號', rating: 4.4, reviews: 112, source: 'Google Maps', status: 'new', color: '#7fb5ba', hasEmail: true, hasPhone: true, hasWebsite: false, email: 'allpower@gmail.com' },
  { name: '北投水電材料行', phone: '02-2893-0123', address: '台北市北投區中央南路一段45號', rating: 3.7, reviews: 31, source: '104人力銀行', status: 'rejected', color: '#8b929a', hasEmail: false, hasPhone: true, hasWebsite: false },
];

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  rejected: 'Rejected',
};

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
}

/* ── Mock browser data ── */
const MOCK_MAP_RESULTS = [
  { name: '宏達水電行', rating: '4.5', reviews: 128, addr: '台北市信義區松仁路100號', phone: '02-2720-xxxx' },
  { name: '永豐水電工程', rating: '4.2', reviews: 85, addr: '台北市大安區復興南路200號', phone: '02-2705-xxxx' },
  { name: '大同水電維修', rating: '4.8', reviews: 203, addr: '台北市中山區南京東路50號', phone: '02-2562-xxxx' },
  { name: '建成水電服務', rating: '3.9', reviews: 42, addr: '台北市萬華區西園路88號', phone: '02-2302-xxxx' },
  { name: '信義水電急修', rating: '4.6', reviews: 156, addr: '台北市松山區八德路300號', phone: '02-2579-xxxx' },
];

const MOCK_LOG_LINES = [
  { time: '10:32:01', msg: '開始搜尋', url: 'google.com/maps' },
  { time: '10:32:03', msg: '載入搜尋結果', url: 'google.com/maps/search/水電工+台北市' },
  { time: '10:32:05', msg: '擷取商家資料', url: '宏達水電行 — 電話、地址、評分' },
  { time: '10:32:08', msg: '擷取商家資料', url: '永豐水電工程 — 電話、地址、評分' },
  { time: '10:32:11', msg: '擷取商家資料', url: '大同水電維修 — 電話、地址、評分' },
  { time: '10:32:14', msg: '翻頁載入更多', url: 'google.com/maps — 第2頁' },
  { time: '10:32:17', msg: '擷取商家資料', url: '建成水電服務 — 電話、地址、評分' },
  { time: '10:32:20', msg: '擷取商家資料', url: '信義水電急修 — 電話、地址、評分' },
];

/* ── Browser Preview Component ── */
const BrowserPreview: React.FC<{ keyword: string; location: string }> = ({ keyword, location }) => {
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [logCount, setLogCount] = useState(3);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t1 = setInterval(() => setHighlightIdx(i => (i + 1) % MOCK_MAP_RESULTS.length), 2500);
    const t2 = setInterval(() => setLogCount(c => Math.min(c + 1, MOCK_LOG_LINES.length)), 2000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logCount]);

  const displayKeyword = keyword || '水電工';
  const displayLocation = location || '台北市';

  return (
    <BrowserFrame>
      <BrowserTabs>
        <BrowserTab $active>Google Maps</BrowserTab>
        <BrowserTab>搜尋結果</BrowserTab>
      </BrowserTabs>
      <BrowserChrome>
        <BrowserDots>
          <span style={{ background: '#ff5f57' }} />
          <span style={{ background: '#febc2e' }} />
          <span style={{ background: '#28c840' }} />
        </BrowserDots>
        <BrowserAddressBar>
          google.com/maps/search/{displayKeyword}+{displayLocation}
        </BrowserAddressBar>
      </BrowserChrome>
      <BrowserBody>
        <ScanOverlay />
        <MockPage>
          <MockSearchBar>
            <MockSearchIcon>🔍</MockSearchIcon>
            <MockSearchText>{displayKeyword} {displayLocation}</MockSearchText>
          </MockSearchBar>
          {MOCK_MAP_RESULTS.map((r, i) => (
            <MockResult key={i} $highlighted={i === highlightIdx}>
              <MockResultName>{r.name}</MockResultName>
              <MockResultMeta>
                <MockStars>{'★'.repeat(Math.floor(Number(r.rating)))}{'☆'.repeat(5 - Math.floor(Number(r.rating)))}</MockStars>
                {' '}{r.rating} ({r.reviews}) · {r.addr}
              </MockResultMeta>
              {i === highlightIdx && <MockResultSnippet>📞 {r.phone} — Agent 正在擷取此商家資料...</MockResultSnippet>}
            </MockResult>
          ))}
        </MockPage>
      </BrowserBody>
      <AgentLog ref={logRef}>
        <AgentLogTitle><AgentDot /> Scraper Agent 活動日誌</AgentLogTitle>
        {MOCK_LOG_LINES.slice(0, logCount).map((line, i) => (
          <LogLine key={i}>
            <LogTime>[{line.time}]</LogTime>
            {line.msg} — <LogUrl>{line.url}</LogUrl>
          </LogLine>
        ))}
      </AgentLog>
    </BrowserFrame>
  );
};

const SearchPage: React.FC = () => {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [targetCount, setTargetCount] = useState(20);
  const [selectedResult, setSelectedResult] = useState<Record<string, unknown> | null>(null);

  /* ── Pipeline SSE state ── */
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [pipelineLogs, setPipelineLogs] = useState<Array<{time: string, stage: string, message: string, level: string}>>([]);
  const [pipelineProgress, setPipelineProgress] = useState<{stage: string, current: number, total: number, percent: number} | null>(null);
  const [pipelineComplete, setPipelineComplete] = useState(false);
  const [realResults, setRealResults] = useState<MockLead[]>([]);
  const pipelineLogRef = useRef<HTMLDivElement>(null);

  /* ── Connect SSE on mount ── */
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    // apiBase is like "http://host:port/api" — SSE endpoint is at /api/events
    // If apiBase ends with /api, strip it and append /api/events
    const sseUrl = apiBase.replace(/\/api\/?$/, '') + '/api/events';
    sseClient.connect(sseUrl);
    return () => {
      sseClient.disconnect();
    };
  }, []);

  /* ── Listen for SSE events filtered by campaignId ── */
  useEffect(() => {
    if (!campaignId) return;

    const unsubLog = sseClient.onEvent('hermes_log', (event: SSEEvent) => {
      const data = event.data as { runId?: string; level?: string; stage?: string; message?: string };
      if (data.runId !== campaignId) return;

      setPipelineLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
        stage: data.stage || '',
        message: data.message || '',
        level: data.level || 'info',
      }]);

      if (data.stage === 'complete') {
        setPipelineComplete(true);
        // Fetch real leads from the API
        leadsApi.list({ page: 1, limit: 500 }).then(res => {
          const leads: Lead[] = (res.data as any)?.data ?? (res.data as any) ?? [];
          const mapped: MockLead[] = leads.map(lead => ({
            name: lead.company_name || '未知公司',
            phone: lead.phone || '',
            address: lead.address || '',
            rating: lead.rating ? parseFloat(lead.rating) : 0,
            reviews: 0,
            source: lead.source || 'Hermes',
            status: lead.status || 'new',
            color: '#5699a3',
            hasEmail: !!(lead.email),
            hasPhone: !!(lead.phone),
            hasWebsite: !!(lead.website),
            email: lead.email,
            website: lead.website,
          }));
          setRealResults(mapped);
        }).catch(err => {
          console.error('[Search] Failed to fetch leads after pipeline:', err);
        });
      }
    });

    const unsubProgress = sseClient.onEvent('pipeline_progress', (event: SSEEvent) => {
      const data = event.data as { runId?: string; stage?: string; current?: number; total?: number; percent?: number };
      if (data.runId !== campaignId) return;
      setPipelineProgress({
        stage: data.stage || '',
        current: data.current || 0,
        total: data.total || 0,
        percent: data.percent || 0,
      });
    });

    // ── 5-min timeout fallback ──
    // If SSE `stage=complete` never arrives (e.g. worker died mid-pipeline),
    // gracefully treat the run as done and fetch whatever leads are in DB.
    // Prevents the UI from being stuck on "處理中" forever.
    const timeoutMs = 5 * 60 * 1000;
    const timeoutId = window.setTimeout(() => {
      setPipelineComplete((prevComplete) => {
        if (prevComplete) return prevComplete; // already done, no-op
        console.warn(
          `[Search] Pipeline ${campaignId} 5 分鐘內冇收到 complete event，` +
          `fallback fetch leads from DB`,
        );
        leadsApi.list({ page: 1, limit: 500 }).then(res => {
          const leads: Lead[] = (res.data as any)?.data ?? (res.data as any) ?? [];
          const mapped: MockLead[] = leads.map(lead => ({
            name: lead.company_name || '未知公司',
            phone: lead.phone || '',
            address: lead.address || '',
            rating: lead.rating ? parseFloat(lead.rating) : 0,
            reviews: 0,
            source: lead.source || 'Hermes',
            status: lead.status || 'new',
            color: '#5699a3',
            hasEmail: !!(lead.email),
            hasPhone: !!(lead.phone),
            hasWebsite: !!(lead.website),
            email: lead.email,
            website: lead.website,
          }));
          setRealResults(mapped);
        }).catch(err => {
          console.error('[Search] Timeout fallback fetch failed:', err);
        });
        return true; // set pipelineComplete=true
      });
    }, timeoutMs);

    return () => {
      unsubLog();
      unsubProgress();
      window.clearTimeout(timeoutId);
    };
  }, [campaignId]);

  /* ── Auto-scroll pipeline log ── */
  useEffect(() => {
    if (pipelineLogRef.current) {
      pipelineLogRef.current.scrollTop = pipelineLogRef.current.scrollHeight;
    }
  }, [pipelineLogs]);

  /* ── Filter state ── */
  const [filterEmail, setFilterEmail] = useState(false);
  const [filterPhone, setFilterPhone] = useState(false);
  const [filterWebsite, setFilterWebsite] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [activeSources, setActiveSources] = useState<Set<string>>(new Set());

  /* ── Determine which result set to display ── */
  const displayResults = pipelineComplete && realResults.length > 0 ? realResults : MOCK_SEARCH_RESULTS;

  const ALL_SOURCES = React.useMemo(() => [...new Set(displayResults.map(r => r.source))], [displayResults]);

  const toggleSource = useCallback((s: string) => {
    setActiveSources(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }, []);

  const filteredResults = React.useMemo(() => {
    return displayResults.filter(lead => {
      if (filterEmail && !lead.hasEmail) return false;
      if (filterPhone && !lead.hasPhone) return false;
      if (filterWebsite && !lead.hasWebsite) return false;
      if (minRating > 0 && lead.rating < minRating) return false;
      if (activeSources.size > 0 && !activeSources.has(lead.source)) return false;
      return true;
    });
  }, [displayResults, filterEmail, filterPhone, filterWebsite, minRating, activeSources]);

  const search = useSearch();

  const handleCloseDetail = useCallback(() => setSelectedResult(null), []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !location.trim()) return;
    const payload: SearchPayload = {
      keyword: keyword.trim(),
      location: location.trim(),
      targetCount,
    };
    // Reset pipeline state for new search
    setCampaignId(null);
    setPipelineLogs([]);
    setPipelineProgress(null);
    setPipelineComplete(false);
    setRealResults([]);

    search.mutate(payload, {
      onSuccess: (response) => {
        const data = response?.data as { campaign_id?: string; first_task?: unknown } | undefined;
        const id = data?.campaign_id;
        if (id) {
          setCampaignId(id);
        }
      },
    });
  };

  const resultData = search.data as unknown;
  const hasResults = search.isSuccess && resultData !== undefined && resultData !== null;
  const resultCount = Array.isArray(resultData) ? (resultData as unknown[]).length : null;
  const isPipelineRunning = !!campaignId && !pipelineComplete;

  return (
    <Page>
      {/* Search Form */}
      <Card>
        <CardBody>
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="search-keyword">{t('search.keyword')}</Label>
              <InputWrap>
                <SvgIcon d="M11 11l3 3M10 6.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z" />
                <InputWithIcon
                  id="search-keyword"
                  type="text"
                  placeholder={t('search.keywordPlaceholder')}
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  required
                />
              </InputWrap>
            </FormGroup>
            <FormGroup>
              <Label htmlFor="search-location">{t('search.location')}</Label>
              <InputWrap>
                <SvgIcon d="M8 1C5.2 1 3 3.2 3 6c0 4 5 9 5 9s5-5 5-9c0-2.8-2.2-5-5-5zM8 7.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                <InputWithIcon
                  id="search-location"
                  type="text"
                  placeholder={t('search.locationPlaceholder')}
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  required
                />
              </InputWrap>
            </FormGroup>
            <FormGroup>
              <Label htmlFor="search-count">{t('search.targetCount')}</Label>
              <Input
                id="search-count"
                type="number"
                min={1}
                max={500}
                value={targetCount}
                onChange={e => setTargetCount(Number(e.target.value))}
              />
            </FormGroup>
            <BtnRow>
              <PrimaryBtn
                type="submit"
                disabled={search.isPending || !keyword.trim() || !location.trim()}
              >
                {search.isPending && <Spinner />}
                {search.isPending ? t('search.searching') : t('search.startSearch')}
              </PrimaryBtn>
            </BtnRow>
          </Form>
        </CardBody>
      </Card>

      {/* Split: Results left, Browser Preview right */}
      <SplitRow>
        <ResultPane>
          {/* ── Pipeline progress view ── */}
          {isPipelineRunning && (
            <Card>
              <CardBody>
                <StatusBanner $type="loading">
                  <Spinner />
                  {t('search.searchingFor')} <strong>{keyword}</strong> {t('search.searchingIn')} <strong>{location}</strong>…
                </StatusBanner>
                <PipelineSection>
                  <PipelineStageLabel>
                    <Spinner />
                    {STAGE_LABELS[pipelineProgress?.stage || 'pipeline'] || pipelineProgress?.stage || '處理中'}
                    {pipelineProgress && ` (${pipelineProgress.current}/${pipelineProgress.total})`}
                  </PipelineStageLabel>
                  <ProgressBarOuter>
                    <ProgressBarInner $percent={pipelineProgress?.percent || 0} />
                  </ProgressBarOuter>
                  {pipelineLogs.length > 0 && (
                    <PipelineLogFeed ref={pipelineLogRef}>
                      {pipelineLogs.map((log, i) => (
                        <PipelineLogLine key={i} $level={log.level}>
                          <PipelineLogTime>[{log.time}]</PipelineLogTime>
                          {log.stage && <PipelineLogStage>[{STAGE_LABELS[log.stage] || log.stage}]</PipelineLogStage>}
                          {log.message}
                        </PipelineLogLine>
                      ))}
                    </PipelineLogFeed>
                  )}
                </PipelineSection>
              </CardBody>
            </Card>
          )}

          {/* ── Mutation pending (before campaign_id returned) ── */}
          {search.isPending && !campaignId && (
            <Card>
              <CardBody>
                <StatusBanner $type="loading">
                  <Spinner />
                  {t('search.searchingFor')} <strong>{keyword}</strong> {t('search.searchingIn')} <strong>{location}</strong>…
                </StatusBanner>
              </CardBody>
            </Card>
          )}

          {/* ── Error ── */}
          {search.isError && !campaignId && (
            <Card>
              <CardBody>
                <StatusBanner $type="error">
                  {t('search.searchFailed')} — {search.error instanceof Error ? search.error.message : t('search.unexpectedError')}
                </StatusBanner>
              </CardBody>
            </Card>
          )}

          {/* ── Pipeline complete banner ── */}
          {pipelineComplete && (
            <Card style={{ marginBottom: 8 }}>
              <CardBody>
                <StatusBanner $type="success">
                  Pipeline 完成 — 共找到 {realResults.length} 筆潛在客戶
                </StatusBanner>
              </CardBody>
            </Card>
          )}

          {/* ── Result cards (mock data before pipeline, real data after) ── */}
          {!isPipelineRunning && !(search.isPending && !campaignId) && (
            <Card>
              <CardBody>
                {/* ── Compact single-row filter ── */}
                <FilterBar>
                  <FilterLabel style={{ fontWeight: 600, color: '#5699a3' }}>{filteredResults.length} 筆結果</FilterLabel>
                  <FilterDivider />
                  <FilterToggle $active={filterEmail} onClick={() => setFilterEmail(p => !p)}>
                    Email({filteredResults.filter(r => r.hasEmail).length})
                  </FilterToggle>
                  <FilterToggle $active={filterPhone} onClick={() => setFilterPhone(p => !p)}>
                    電話({filteredResults.filter(r => r.hasPhone).length})
                  </FilterToggle>
                  <FilterToggle $active={filterWebsite} onClick={() => setFilterWebsite(p => !p)}>
                    官網({filteredResults.filter(r => r.hasWebsite).length})
                  </FilterToggle>
                  <FilterDivider />
                  <FilterLabel>{'★'} {'≥'} {minRating > 0 ? minRating.toFixed(1) : '不限'}</FilterLabel>
                  <RatingSlider type="range" min={0} max={5} step={0.5} value={minRating} onChange={e => setMinRating(Number(e.target.value))} />
                  <FilterDivider />
                  {ALL_SOURCES.map(src => (
                    <SourceChip key={src} $active={activeSources.has(src)} onClick={() => toggleSource(src)}>
                      {src}
                    </SourceChip>
                  ))}
                </FilterBar>

                <ResultCardList>
                  {filteredResults.length === 0 ? (
                    <EmptyState>沒有符合篩選條件的結果</EmptyState>
                  ) : filteredResults.map((lead, i) => (
                    <ResultCard key={i} onClick={() => setSelectedResult(lead as unknown as Record<string, unknown>)}>
                      <RcAvatar $color={lead.color}>{lead.name.charAt(0)}</RcAvatar>
                      <RcBody>
                        <RcTopRow>
                          <RcName>{lead.name}</RcName>
                          <RcStars>{renderStars(lead.rating)}</RcStars>
                          <RcRatingText>{lead.rating} ({lead.reviews})</RcRatingText>
                        </RcTopRow>
                        <RcMeta>
                          <SvgIcon d="M8 1C5.2 1 3 3.2 3 6c0 4 5 9 5 9s5-5 5-9c0-2.8-2.2-5-5-5z" size={11} />
                          {lead.address}
                        </RcMeta>
                        <RcPhone>
                          <SvgIcon d="M3 2h3l1.5 3L6 6.5C7 8.5 8.5 10 10.5 11l1.5-1.5 3 1.5v3c0 .6-.4 1-1 1C7.5 15 1 8.5 1 3c0-.6.4-1 1-1z" size={11} />
                          {' '}{lead.phone}
                        </RcPhone>
                        <RcContactIcons>
                          <ContactIcon $has={lead.hasEmail}>
                            <SvgIcon d="M2 4h12M2 4l3 8h6l3-8M5 12v2M11 12v2" size={10} />
                            {lead.hasEmail ? (lead.email || 'Email') : '無Email'}
                          </ContactIcon>
                          <ContactIcon $has={lead.hasWebsite}>
                            <SvgIcon d="M2 3h12v10H2zM2 6h12" size={10} />
                            {lead.hasWebsite ? (lead.website || '官網') : '無官網'}
                          </ContactIcon>
                        </RcContactIcons>
                      </RcBody>
                      <RcActions>
                        <RcStatusBadge $status={lead.status}>{STATUS_LABELS[lead.status] || lead.status}</RcStatusBadge>
                        <RcSmallBtn onClick={e => { e.stopPropagation(); }}>+ Pipeline</RcSmallBtn>
                      </RcActions>
                    </ResultCard>
                  ))}
                </ResultCardList>
              </CardBody>
            </Card>
          )}
        </ResultPane>

        <div style={{ position: 'sticky', top: 72, alignSelf: 'start' }}>
          <BrowserPreview keyword={keyword} location={location} />
        </div>
      </SplitRow>

      {/* Detail Panel */}
      {selectedResult && createPortal(
        <>
          <DpOverlay onClick={handleCloseDetail} />
          <DpPanel>
            <DpHeader>
              <DpHeaderInfo>
                <DpTitle>{getResultTitle(selectedResult)}</DpTitle>
                <DpTypeBadge>
                  🔍&ensp;{getResultType(selectedResult)}
                </DpTypeBadge>
              </DpHeaderInfo>
              <DpCloseBtn onClick={handleCloseDetail}>&times;</DpCloseBtn>
            </DpHeader>

            <DpBody>
              {/* Info section — all fields */}
              <DpSectionTitle>Details</DpSectionTitle>
              <DpGrid>
                {Object.entries(selectedResult).map(([key, val]) => (
                  <DpField key={key}>
                    <DpFieldLabel>{key.replace(/_/g, ' ')}</DpFieldLabel>
                    <DpFieldValue>
                      {val === null || val === undefined
                        ? '—'
                        : typeof val === 'object'
                        ? JSON.stringify(val)
                        : String(val)}
                    </DpFieldValue>
                  </DpField>
                ))}
              </DpGrid>

              {/* Preview / content section */}
              <DpSectionTitle>Preview</DpSectionTitle>
              <DpPreviewBox>{getResultPreview(selectedResult)}</DpPreviewBox>

              {/* Related items */}
              <DpSectionTitle>Related</DpSectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {MOCK_RELATED.map((item, i) => (
                  <DpRelatedItem key={i}>
                    <DpRelatedIcon style={{ background: item.color }}>
                      {item.type.slice(0, 2).toUpperCase()}
                    </DpRelatedIcon>
                    <span>{item.title}</span>
                  </DpRelatedItem>
                ))}
              </div>
            </DpBody>

            <DpFooter>
              <DpActionBtn
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedResult, null, 2));
                }}
              >
                複製
              </DpActionBtn>
              <DpActionBtn $variant="primary">
                查看原始資料
              </DpActionBtn>
            </DpFooter>
          </DpPanel>
        </>,
        document.body
      )}

      {/* Footer */}
      <Footer>
        <span>{t('footer.copyrightHermes', { year: 2024 })}</span>
        <div>
          <a href="#">{t('footer.documentation')}</a>
          <a href="#">{t('footer.support')}</a>
          <a href="#">{t('footer.faqs')}</a>
        </div>
      </Footer>
    </Page>
  );
};

export default SearchPage;
