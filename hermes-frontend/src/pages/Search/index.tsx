import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../../api/hooks';
import { SearchPayload, hermesApi } from '../../api/services';
import { sseClient, SSEEvent } from '../../api/sse';
import { leadsApi, Lead } from '../../api/leads';
import { media } from '../../styles/media';

/* ══════════════════════════════════════
   CMS Search — LUNO-style UI
   ══════════════════════════════════════ */

/* ── Avatar helper ── */
const avatarPalette = ['#bfdbfe', '#c4b5fd', '#a5f3fc', '#bbf7d0'];
function hashAvatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return avatarPalette[Math.abs(h) % avatarPalette.length];
}

/* ── Layout primitives ── */

const Page = styled.div<{ $hasResults?: boolean }>`
  display: flex; flex-direction: column; align-items: center;
  justify-content: ${({ $hasResults }) => $hasResults ? 'flex-start' : 'center'};
  min-height: calc(100vh - 64px); gap: ${({ theme }) => theme.spacing.md}px;
  padding-bottom: ${({ $hasResults }) => $hasResults ? '40px' : '22vh'};
  ${({ $hasResults }) => $hasResults && 'padding-top: 40px;'}
`;

const GREETINGS = [
  'Find your next client',
  'Let AI discover opportunities',
  'Search, filter, close the deal',
  'Your next lead starts here',
  'Who are you looking for today?',
];

const Greeting = styled.p`
  margin: 0 0 28px;
  font-size: clamp(1.25rem, 4vw, 2rem);
  font-weight: 300;
  color: ${({ theme }) => theme.colors.textPrimary};
  text-align: center;
  letter-spacing: 0.01em;
  padding: 0 24px;
`;

/* ── Glow wrapper ── */
const haloPulse = keyframes`
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.12); }
`;

const floatDot = keyframes`
  0%   { transform: translate(0, 0)   scale(1);   opacity: 0.7; }
  25%  { transform: translate(12px, -18px) scale(1.2); opacity: 1;   }
  50%  { transform: translate(-8px, -30px) scale(0.8); opacity: 0.5; }
  75%  { transform: translate(-16px, -10px) scale(1.1); opacity: 0.9; }
  100% { transform: translate(0, 0)   scale(1);   opacity: 0.7; }
`;

const GlowWrap = styled.div`
  position: relative;
  max-width: 760px;
  width: calc(100% - 48px);
  ${media.mobile} { width: calc(100% - 32px); }

  /* soft halo behind the bar */
  &::before {
    content: '';
    position: absolute;
    inset: -40px -60px;
    border-radius: 999px;
    background: radial-gradient(ellipse at center, rgba(96,165,250,0.32) 0%, rgba(96,165,250,0.14) 40%, rgba(96,165,250,0.04) 65%, transparent 80%);
    filter: blur(28px);
    animation: ${haloPulse} 4s ease-in-out infinite;
    pointer-events: none;
    z-index: 0;
  }
`;

/* individual floating dots — very subtle */
const Dot = styled.span<{ $x: string; $y: string; $size: number; $delay: number; $dur: number }>`
  position: absolute;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: rgba(96,165,250,0.3);
  box-shadow: 0 0 ${({ $size }) => $size * 3}px rgba(96,165,250,0.18);
  left: ${({ $x }) => $x};
  top: ${({ $y }) => $y};
  animation: ${floatDot} ${({ $dur }) => $dur}s ease-in-out ${({ $delay }) => $delay}s infinite;
  pointer-events: none;
  z-index: 0;
`;

const DOT_CONFIG = [
  { x: '6%',  y: '20%', size: 2.5, delay: 0,   dur: 5 },
  { x: '94%', y: '30%', size: 2,   delay: 1.2, dur: 6 },
  { x: '15%', y: '80%', size: 3,   delay: 0.6, dur: 4.5 },
  { x: '88%', y: '75%', size: 2,   delay: 2,   dur: 5.5 },
  { x: '50%', y: '2%',  size: 2.5, delay: 0.8, dur: 6.5 },
  { x: '32%', y: '92%', size: 2,   delay: 1.5, dur: 5 },
  { x: '72%', y: '8%',  size: 2,   delay: 0.3, dur: 4 },
  { x: '3%',  y: '50%', size: 2.5, delay: 2.2, dur: 5.8 },
  { x: '96%', y: '55%', size: 2,   delay: 0.9, dur: 4.8 },
  { x: '62%', y: '88%', size: 2,   delay: 1.8, dur: 6.2 },
];

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

const CardBody = styled.div`padding: 20px;`;

/* ── Form ── */

/* ── Unified Search Bar ── */

const UnifiedBar = styled.div<{ $morphing?: boolean }>`
  display: flex;
  align-items: center;
  border-radius: 999px;
  border: 1.5px solid ${({ theme, $morphing }) => $morphing ? 'transparent' : theme.colors.border};
  background: ${({ theme, $morphing }) => $morphing ? 'transparent' : theme.colors.surface};
  box-shadow: ${({ $morphing }) => $morphing ? 'none' : '0 2px 12px rgba(15,23,42,0.06)'};
  overflow: visible; position: relative;
  z-index: 1;

  /* morph transition */
  width: ${({ $morphing }) => $morphing ? '144px' : '100%'};
  height: ${({ $morphing }) => $morphing ? '144px' : 'auto'};
  margin: ${({ $morphing }) => $morphing ? '0 auto' : '0'};
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1),
              height 0.5s cubic-bezier(0.4, 0, 0.2, 1),
              margin 0.5s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.3s,
              background 0.3s,
              box-shadow 0.3s;
  justify-content: ${({ $morphing }) => $morphing ? 'center' : 'flex-start'};

  & > *:not(.search-ring) {
    opacity: ${({ $morphing }) => $morphing ? 0 : 1};
    pointer-events: ${({ $morphing }) => $morphing ? 'none' : 'auto'};
    transition: opacity 0.2s;
    ${({ $morphing }) => $morphing && 'position: absolute; width: 0; overflow: hidden;'}
  }

  &:focus-within {
    border-color: ${({ theme, $morphing }) => $morphing ? 'transparent' : theme.colors.blue};
    box-shadow: ${({ $morphing }) => $morphing ? 'none' : '0 2px 20px rgba(37,99,235,0.12)'};
  }
`;

const BarInput = styled.input`
  flex: 1; min-width: 0;
  border: none; outline: none;
  padding: 18px 0 18px 28px;
  font-size: 1.05rem;
  ${media.mobile} { padding: 14px 0 14px 18px; font-size: 0.9375rem; }
  background: transparent;
  color: ${({ theme }) => theme.colors.textPrimary};
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; }
`;

const LocBadge = styled.button`
  display: flex; align-items: center; gap: 5px;
  padding: 6px 12px; margin: 0 4px;
  border: none; border-radius: 999px;
  background: #fef2f2; color: #b91c1c;
  font-size: 0.6875rem; font-weight: 700;
  cursor: pointer; white-space: nowrap; flex-shrink: 0;
  transition: background 0.15s;
  &:hover { background: #fee2e2; }
  position: relative;
`;

const LocFlag = styled.span`
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border-radius: 4px;
  background: #dc2626; color: #fff;
  font-size: 0.5rem; font-weight: 800; letter-spacing: -0.02em;
`;

const BarSearchBtn = styled.button`
  display: flex; align-items: center; justify-content: center;
  width: 46px; height: 46px; margin: 5px 6px 5px 0;
  border: none; border-radius: 50%;
  background: #2563eb; color: #fff;
  cursor: pointer; flex-shrink: 0;
  transition: background 0.15s, transform 0.15s;
  &:hover:not(:disabled) { background: #1d4ed8; transform: scale(1.06); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

/* Location picker dropdown */
const LocDropdown = styled.div`
  position: absolute; top: calc(100% + 6px); right: 50px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(15,23,42,0.12);
  padding: 8px; z-index: 100;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;
  min-width: 280px;
  ${media.mobile} { grid-template-columns: repeat(2, 1fr); min-width: 220px; right: 0; }
`;

const LocOption = styled.button<{ $active?: boolean }>`
  padding: 6px 10px; border: none;
  border-radius: 8px; font-size: 0.75rem; font-weight: 500;
  cursor: pointer; white-space: nowrap;
  background: ${({ $active }) => $active ? '#fee2e2' : 'transparent'};
  color: ${({ $active, theme }) => $active ? '#dc2626' : theme.colors.textSecondary};
  transition: background 0.12s;
  &:hover { background: ${({ $active }) => $active ? '#fee2e2' : '#f1f5f9'}; }
`;

const HK_DISTRICTS = [
  '全區', '中西區', '灣仔', '東區', '南區',
  '油尖旺', '深水埗', '九龍城', '黃大仙', '觀塘',
  '葵青', '荃灣', '屯門', '元朗', '北區', '大埔', '沙田', '西貢', '離島',
];

/* ── Glow animation ── */
const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(37,99,235,0.08), 0 0 20px rgba(37,99,235,0.03); }
  50% { box-shadow: 0 0 14px rgba(37,99,235,0.14), 0 0 32px rgba(37,99,235,0.06); }
`;

const SearchHero = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  padding: 24px 56px 28px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fdfdff 0%, #f9faff 50%, #fafbff 100%);
  box-shadow: 0 1px 4px rgba(37,99,235,0.04);
  ${media.mobile} { flex-direction: column; padding: 28px 20px; gap: 28px; }
`;

/* A区: 左侧输入 */
const AreaA = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
  min-width: 0;
  ${media.mobile} { flex-direction: column; width: 100%; gap: 16px; }
`;

const TextFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 2;
  min-width: 0;
`;

const UnderlineInput = styled.input`
  width: 100%;
  padding: 8px 0;
  border: none;
  border-bottom: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  font-size: 0.9375rem;
  outline: none;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: radial-gradient(ellipse 60% 24px at 50% calc(100% + 2px), rgba(37,99,235,0.12) 0%, rgba(37,99,235,0.04) 50%, transparent 100%);
  transition: border-color 0.2s, background 0.2s;
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; }
  &:focus {
    border-bottom-color: ${({ theme }) => theme.colors.blue};
    background: radial-gradient(ellipse 70% 32px at 50% calc(100% + 2px), rgba(37,99,235,0.18) 0%, rgba(37,99,235,0.06) 50%, transparent 100%);
  }
`;

const FieldLabel = styled.label`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.blue};
  letter-spacing: 0.03em;
  padding-left: 2px;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

/* 数字框 */
const NumberWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
  position: relative;
  &::after {
    content: '';
    position: absolute;
    bottom: -12px;
    left: 26px;
    transform: translateX(-50%);
    width: 80px;
    height: 60px;
    border-radius: 50%;
    background: radial-gradient(ellipse at 50% 50%, rgba(37,99,235,0.10) 0%, rgba(37,99,235,0.05) 25%, rgba(37,99,235,0.02) 45%, rgba(37,99,235,0.005) 65%, transparent 85%);
    filter: blur(4px);
    pointer-events: none;
  }
`;

const NumberInput = styled.input`
  width: 52px;
  padding: 6px 0;
  border: none;
  border-radius: 0;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
  outline: none;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: transparent;
  -moz-appearance: textfield;
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  &:focus { border-bottom-color: ${({ theme }) => theme.colors.blue}; }
`;

const NumArrows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: 4px;
`;

const NumArrowBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 16px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: ${({ theme }) => theme.colors.textTertiary};
  cursor: pointer;
  padding: 0;
  transition: color 0.15s, background 0.15s;
  &:hover {
    color: ${({ theme }) => theme.colors.blue};
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }
`;

/* A/B 分隔 */
const Separator = styled.div`
  width: 1px;
  align-self: stretch;
  margin: 0 24px;
  background: ${({ theme }) => theme.colors.border};
  ${media.mobile} { display: none; }
`;

/* B区: 圆形按钮 + 星星 */
const sparkle = keyframes`
  0% { transform: translate(0,0) scale(1); opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
`;

const BtnWrap = styled.div`
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CircleBtn = styled.button`
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #60a5fa 100%);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(37,99,235,0.3), 0 0 24px rgba(59,130,246,0.2);
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  z-index: 1;
  &:hover:not(:disabled) {
    transform: scale(1.08);
    box-shadow: 0 4px 20px rgba(37,99,235,0.45), 0 0 32px rgba(59,130,246,0.3);
  }
  &:active:not(:disabled) { transform: scale(0.96); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Sparkle = styled.span<{ $i: number }>`
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.blue};
  opacity: 0;
  --tx: ${({ $i }) => ['-18px','20px','6px','-14px','22px','-20px','12px','-8px'][$i % 8]};
  --ty: ${({ $i }) => ['-22px','-16px','24px','20px','8px','-24px','-10px','22px'][$i % 8]};
  animation: ${sparkle} ${({ $i }) => 1.2 + ($i % 4) * 0.3}s ease-out infinite;
  animation-delay: ${({ $i }) => ($i * 0.25)}s;
`;

const SearchBtnIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const Spinner = styled.span`
  display: inline-block; width: 18px; height: 18px;
  border: 2px solid currentColor; border-top-color: transparent;
  border-radius: 50%; animation: spin 0.7s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

/* ── Search Ring (morph target) ── */

const ringRotate = keyframes`
  to { transform: rotate(360deg); }
`;

const ringPulse = keyframes`
  0%, 100% { filter: drop-shadow(0 0 6px rgba(37,99,235,0.3)); }
  50%      { filter: drop-shadow(0 0 14px rgba(37,99,235,0.5)); }
`;

const SearchRingWrap = styled.div.attrs({ className: 'search-ring' })`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
`;

const SearchRing = styled.div<{ $percent?: number }>`
  width: 140px;
  height: 140px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${ringPulse} 2s ease-in-out infinite;

  svg.ring-svg {
    position: absolute;
    inset: 0;
    animation: ${({ $percent }) => $percent === undefined ? ringRotate : 'none'} 1.2s linear infinite;
  }
`;

const RingCount = styled.span`
  font-size: 0.9375rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  z-index: 1;
  letter-spacing: -0.02em;
`;

const RingStage = styled.span`
  font-size: 0.8125rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.blue};
  text-align: center;
  line-height: 1.4;
`;

const RingHint = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  text-align: center;
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
    $type === 'success' ? `${theme.colors.green}0d`
    : $type === 'error' ? `${theme.colors.red}0d`
    : `${theme.colors.blue}0d`};
  color: ${({ $type, theme }) =>
    $type === 'success' ? theme.colors.green
    : $type === 'error' ? theme.colors.red
    : theme.colors.blue};
  border: 1px solid ${({ $type, theme }) =>
    $type === 'success' ? `${theme.colors.green}33`
    : $type === 'error' ? `${theme.colors.red}33`
    : `${theme.colors.blue}33`};
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
    background: ${({ theme }) => theme.colors.surfaceMuted};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const TRow = styled.tr<{ $even?: boolean }>`
  background: ${({ $even, theme }) => $even
    ? theme.colors.surfaceMuted
    : theme.colors.surface};
  transition: background 0.15s, box-shadow 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    box-shadow: 0 1px 4px rgba(15,23,42,0.06);
  }
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
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid #3b82f6;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    box-shadow: 0 2px 8px rgba(15,23,42,0.07);
    transform: translateY(-1px);
  }
`;

const RcAvatar = styled.div<{ $color: string }>`
  width: 36px; height: 36px;
  border-radius: 8px;
  background: ${({ $color }) => $color};
  color: #334155;
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
  font-size: 0.75rem; color: #16a34a; font-weight: 500;
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
    $status === 'qualified' ? '#2563eb22' :
    $status === 'contacted' ? '#d9770622' :
    $status === 'rejected' ? '#dc262622' :
    '#3b82f622'};
  color: ${({ $status }) =>
    $status === 'qualified' ? '#2563eb' :
    $status === 'contacted' ? '#94a3b8' :
    $status === 'rejected' ? '#dc2626' :
    '#3b82f6'};
`;

const RcActions = styled.div`
  display: flex; flex-direction: column; align-items: flex-end;
  gap: 6px; flex-shrink: 0;
`;

const RcSmallBtn = styled.button`
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    border-color: #2563eb;
    color: #2563eb;
  }
`;

/* ── Search form icon ── */

const InputWrap = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  svg {
    position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.blue}; pointer-events: none;
  }
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
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
  border-bottom: 2px solid transparent;
  border-image: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899) 1;
  border-image-slice: 1;
  border-top: none;
  border-left: none;
  border-right: none;
`;

const FilterToggle = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 99px;
  border: 1px solid ${({ $active, theme }) => $active ? '#2563eb' : theme.colors.border};
  background: ${({ $active }) => $active ? '#2563eb22' : 'transparent'};
  color: ${({ $active, theme }) => $active ? '#2563eb' : theme.colors.textSecondary};
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: #2563eb; color: #2563eb; }
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
    background: #2563eb;
    cursor: pointer;
  }
`;

const SourceChip = styled.button<{ $active: boolean; $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 99px;
  border: 1px solid ${({ $active, $color, theme }) => $active ? ($color || '#2563eb') : theme.colors.border};
  background: ${({ $active, $color }) => $active ? `${$color || '#2563eb'}22` : 'transparent'};
  color: ${({ $active, $color, theme }) => $active ? ($color || '#2563eb') : theme.colors.textSecondary};
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: ${({ $color }) => $color || '#2563eb'}; color: ${({ $color }) => $color || '#2563eb'}; }
`;

/* ── Contact info icons on card ── */

const RcContactIcons = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
`;

const ContactIcon = styled.span<{ $has: boolean; $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.625rem;
  color: ${({ $has, $color }) => $has ? ($color || '#2563eb') : '#cbd5e1'};
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
  background: #2563eb22;
  color: #2563eb;
`;

const DpCloseBtn = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.blue};
  flex-shrink: 0;
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)'};
  }
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
  border-radius: 8px;
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
  border-radius: 14px;
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
  border-bottom: 1px solid #cbd5e1;
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
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 10px;
  color: #94a3b8;
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
  background: ${({ $active }) => $active ? '#f0f0f0' : '#cbd5e1'};
  color: ${({ $active }) => $active ? '#1e293b' : '#94a3b8'};
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
  background: rgba(37,99,235,0.15);
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
  border: 1px solid #cbd5e1;
  border-radius: 20px;
  margin-bottom: 4px;
`;

const MockSearchIcon = styled.span`
  font-size: 10px;
  color: #999;
`;

const MockSearchText = styled.span`
  font-size: 10px;
  color: #1e293b;
  font-weight: 500;
`;

const MockResult = styled.div<{ $highlighted?: boolean }>`
  padding: 6px 8px;
  border-radius: 4px;
  border-left: 2px solid transparent;
  ${({ $highlighted }) => $highlighted && css`
    background: rgba(37,99,235,0.08);
    border-left-color: #2563eb;
  `}
`;

const MockResultName = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: #1a0dab;
`;

const MockResultMeta = styled.div`
  font-size: 9px;
  color: #94a3b8;
  margin-top: 1px;
`;

const MockResultSnippet = styled.div`
  font-size: 9px;
  color: #475569;
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
  background: #16a34a;
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
  color: #2563eb;
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
  background: #2563eb;
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

/* ── Skeleton loader (replaces search bar while pipeline runs) ── */
const skeletonShimmer = keyframes`
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`;

const SkeletonWrap = styled.div`
  width: 100%;
  max-width: 760px;
  padding: 14px 18px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SkeletonBar = styled.div<{ $w: number; $h?: number }>`
  flex: none;
  width: ${({ $w }) => $w}px;
  height: ${({ $h }) => $h ?? 12}px;
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.border} 0%,
    ${({ theme }) => theme.colors.surfaceMuted} 50%,
    ${({ theme }) => theme.colors.border} 100%
  );
  background-size: 800px 100%;
  animation: ${skeletonShimmer} 1.4s ease-in-out infinite;
`;

const skeletonSpin = keyframes`
  to { transform: rotate(360deg); }
`;

const SkeletonSpinner = styled.div`
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 50%;
  border: 2.5px solid ${({ theme }) => theme.colors.border};
  border-top-color: #2563eb;
  animation: ${skeletonSpin} 0.9s linear infinite;
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
    : $level === 'warn' ? '#d97706'
    : theme.colors.textSecondary};
`;

const PipelineLogTime = styled.span`
  color: ${({ theme }) => theme.colors.blue};
  margin-right: 6px;
`;

const PipelineLogStage = styled.span`
  color: #2563eb;
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
  business: '#2563eb',
  person: '#3b82f6',
  place: '#d97706',
  default: '#2563eb',
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
  { title: 'Similar result in nearby area', type: 'location', color: '#2563eb' },
  { title: 'Related business listing', type: 'business', color: '#3b82f6' },
  { title: 'Matching industry entry', type: 'industry', color: '#d97706' },
];

/* ── Mock search results (displayed by default) ── */

interface MockLead {
  _id?: string;
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
  { name: '宏達水電行', phone: '02-2720-1234', address: '台北市信義區松仁路100號', rating: 4.5, reviews: 128, source: 'Google Maps', status: 'new', color: '#2563eb', hasEmail: true, hasPhone: true, hasWebsite: true, email: 'info@hongda.com.tw', website: 'hongda.com.tw' },
  { name: '永豐水電工程', phone: '02-2705-5678', address: '台北市大安區復興南路200號', rating: 4.2, reviews: 85, source: 'Google Maps', status: 'new', color: '#3b82f6', hasEmail: false, hasPhone: true, hasWebsite: false },
  { name: '大同水電維修', phone: '02-2562-9012', address: '台北市中山區南京東路50號', rating: 4.8, reviews: 203, source: 'Google Maps', status: 'contacted', color: '#d97706', hasEmail: true, hasPhone: true, hasWebsite: true, email: 'service@datong-water.tw', website: 'datong-water.tw' },
  { name: '建成水電服務', phone: '02-2302-3456', address: '台北市萬華區西園路88號', rating: 3.9, reviews: 42, source: 'LinkedIn', status: 'new', color: '#1d4ed8', hasEmail: true, hasPhone: true, hasWebsite: false, email: 'jiancheng.plumb@gmail.com' },
  { name: '信義水電急修', phone: '02-2579-7890', address: '台北市松山區八德路300號', rating: 4.6, reviews: 156, source: 'Google Maps', status: 'qualified', color: '#2563eb', hasEmail: true, hasPhone: true, hasWebsite: true, email: 'contact@xinyi-fix.com', website: 'xinyi-fix.com' },
  { name: '台北水電到府', phone: '02-2771-2345', address: '台北市大安區忠孝東路四段120號', rating: 4.1, reviews: 67, source: 'LinkedIn', status: 'new', color: '#dc2626', hasEmail: false, hasPhone: true, hasWebsite: true, website: 'taipei-plumber.tw' },
  { name: '全能水電工程行', phone: '02-2391-6789', address: '台北市中正區重慶南路一段80號', rating: 4.4, reviews: 112, source: 'Google Maps', status: 'new', color: '#3b82f6', hasEmail: true, hasPhone: true, hasWebsite: false, email: 'allpower@gmail.com' },
  { name: '北投水電材料行', phone: '02-2893-0123', address: '台北市北投區中央南路一段45號', rating: 3.7, reviews: 31, source: '104人力銀行', status: 'rejected', color: '#94a3b8', hasEmail: false, hasPhone: true, hasWebsite: false },
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
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  // ponytail: restore form state from localStorage so refresh doesn't wipe it.
  // Falls back to defaults if key missing or JSON corrupt.
  const readSavedForm = (): { kw: string; loc: string; dist: string; tc: number } => {
    try {
      const raw = localStorage.getItem('search-form');
      if (raw) {
        const j = JSON.parse(raw);
        if (typeof j.kw === 'string') return j;
      }
    } catch { /* ignore corrupt localStorage */ }
    return { kw: '', loc: '香港', dist: '全區', tc: 20 };
  };
  const saved = readSavedForm();
  const [keyword, setKeyword] = useState(saved.kw);
  const [location, setLocation] = useState(saved.loc);
  const [district, setDistrict] = useState(saved.dist);
  const [showLocPicker, setShowLocPicker] = useState(false);
  const [targetCount, setTargetCount] = useState(saved.tc);
  const navigate = useNavigate();
  const locRef = useRef<HTMLFormElement>(null);

  /* Close location picker on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (locRef.current && !locRef.current.contains(e.target as Node)) setShowLocPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Pipeline SSE state ── */
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [pipelineLogs, setPipelineLogs] = useState<Array<{time: string, stage: string, message: string, level: string}>>([]);
  const [pipelineProgress, setPipelineProgress] = useState<{stage: string, current: number, total: number, percent: number} | null>(null);
  const [pipelineComplete, setPipelineComplete] = useState(false);
  const [realResults, setRealResults] = useState<MockLead[]>([]);
  const pipelineLogRef = useRef<HTMLDivElement>(null);

  // ponytail: lazy permission request — only ask the user once a pipeline has
  // actually completed. Asking on mount gets blanket-denied in most browsers.
  const ensureNotificationPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch { return false; }
  }, []);

  const fireCompletionNotification = useCallback((leadCount: number) => {
    // ponytail: fire-and-forget. Awaiting would block the SSE handler which
    // already triggered the fetch-and-finish path; that's harmless to run
    // while permission dialog is up.
    void ensureNotificationPermission().then((granted) => {
      if (!granted) return;
      try {
        new Notification('潛在客戶搜尋完成', {
          body: `搵到 ${leadCount} 筆新結果，撳去睇 →`,
          tag: 'search-complete',
        });
      } catch (e) {
        console.warn('[Search] Notification failed:', e);
      }
    });
  }, [ensureNotificationPermission]);

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

  /* ── Helper: map Lead → MockLead ── */
  const mapLead = (lead: Lead): MockLead => ({
    _id: lead._id,
    name: lead.company_name || '未知公司',
    phone: lead.phone || '',
    address: lead.address || '',
    rating: lead.rating ? parseFloat(lead.rating) : 0,
    reviews: 0,
    source: lead.source || 'Hermes',
    status: lead.status || 'new',
    color: '#2563eb',
    hasEmail: !!(lead.email),
    hasPhone: !!(lead.phone),
    hasWebsite: !!(lead.website),
    email: lead.email,
    website: lead.website,
  });

  /* ── Helper: fetch campaign leads and mark pipeline complete ── */
  // ponytail: defined BEFORE the mount-restore useEffect below — TDZ trap if
  // the useEffect runs first. React doesn't hoist useCallback.
  const fetchLeadsAndFinish = useCallback((cId: string) => {
    // 先拎 campaign 嘅 lead_ids，再逐個 fetch 只屬於呢次搜尋嘅 leads
    hermesApi.getCampaign(cId).then(res => {
      const campaign = (res.data as any)?.data ?? res.data;
      const leadIds: string[] = campaign?.lead_ids ?? [];
      if (leadIds.length === 0) {
        setRealResults([]);
        setPipelineComplete(true);
        fireCompletionNotification(0);
        /* localStorage campaign persistence removed — refresh clears search */
        return;
      }
      Promise.all(leadIds.map(id => leadsApi.get(id).then(r => {
        const lead: Lead = (r.data as any)?.data ?? r.data;
        return lead;
      }).catch(() => null)))
        .then(results => {
          const mapped = results.filter(Boolean).map(l => mapLead(l as Lead));
          setRealResults(mapped);
          setPipelineComplete(true);
          fireCompletionNotification(mapped.length);
          // ponytail: pipeline done — drop the saved campaignId so a refresh
          // doesn't try to reattach to a finished campaign.
          /* localStorage campaign persistence removed — refresh clears search */
        });
    }).catch(err => {
      console.error('[Search] Failed to fetch campaign leads:', err);
      setPipelineComplete(true);
      fireCompletionNotification(0);
      try { localStorage.removeItem('search-campaign-id'); } catch {}
    });
  }, [fireCompletionNotification]);

  /* ── Listen for SSE events filtered by campaignId ── */
  useEffect(() => {
    if (!campaignId) return;
    let done = false;

    const unsubLog = sseClient.onEvent('hermes_log', (event: SSEEvent) => {
      const data = event.data as { runId?: string; level?: string; stage?: string; message?: string };
      if (data.runId !== campaignId) return;

      setPipelineLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
        stage: data.stage || '',
        message: data.message || '',
        level: data.level || 'info',
      }]);

      if (data.stage === 'complete' && !done) {
        done = true;
        fetchLeadsAndFinish(campaignId);
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

    // ── Poll campaign status 做 fallback ──
    // Pipeline 可能喺 useEffect 註冊 SSE listener 之前已完成，
    // 所以用 polling 補救：每 3 秒查一次 campaign 狀態。
    const pollId = window.setInterval(() => {
      if (done) return;
      hermesApi.getCampaign(campaignId).then(res => {
        const campaign = (res.data as any)?.data ?? res.data;
        if (campaign?.status === 'completed' && !done) {
          done = true;
          fetchLeadsAndFinish(campaignId);
        }
      }).catch(() => { /* ignore polling errors */ });
    }, 3000);

    // ── 30-min hard timeout ──
    const timeoutId = window.setTimeout(() => {
      if (!done) {
        done = true;
        console.warn(`[Search] Pipeline ${campaignId} timed out after 30 min`);
        fetchLeadsAndFinish(campaignId);
      }
    }, 30 * 60 * 1000);

    return () => {
      unsubLog();
      unsubProgress();
      window.clearInterval(pollId);
      window.clearTimeout(timeoutId);
    };
  }, [campaignId, fetchLeadsAndFinish]);

  /* ── Auto-scroll pipeline log ── */
  useEffect(() => {
    if (pipelineLogRef.current) {
      pipelineLogRef.current.scrollTop = pipelineLogRef.current.scrollHeight;
    }
  }, [pipelineLogs]);

  /* ── Clear form after pipeline completes ── */
  useEffect(() => {
    if (pipelineComplete) {
      setKeyword('');
      setLocation('香港');
      setDistrict('全區');
      setTargetCount(20);
      try { localStorage.removeItem('search-form'); } catch {}
    }
  }, [pipelineComplete]);

  /* ── Filter state ── */
  const [filterEmail, setFilterEmail] = useState(false);
  const [filterPhone, setFilterPhone] = useState(false);
  const [filterWebsite, setFilterWebsite] = useState(false);
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
      if (activeSources.size > 0 && !activeSources.has(lead.source)) return false;
      return true;
    });
  }, [displayResults, filterEmail, filterPhone, filterWebsite, activeSources]);

  const search = useSearch();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ponytail: gate re-entrant submits. Button `disabled` is a DOM hint;
    // form onSubmit / Enter-on-input can still fire while mutation is in flight.
    if (search.isPending || !keyword.trim()) return;
    const fullLocation = district === '全區' ? location : `${location} ${district}`;
    const payload: SearchPayload = {
      keyword: keyword.trim(),
      location: fullLocation.trim(),
      targetCount,
    };
    // ponytail: persist form so a refresh during the pipeline restores inputs.
    try {
      localStorage.setItem('search-form', JSON.stringify({
        kw: payload.keyword,
        loc: location,
        dist: district,
        tc: targetCount,
      }));
    } catch { /* ignore quota / disabled storage */ }
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
          // ponytail: remember campaignId so a refresh can restore the pipeline.
          /* localStorage campaign persistence removed — refresh clears search */
        }
      },
    });
  };

  const resultData = search.data as unknown;
  const hasResults = search.isSuccess && resultData !== undefined && resultData !== null;
  const resultCount = Array.isArray(resultData) ? (resultData as unknown[]).length : null;
  const isPipelineRunning = !!campaignId && !pipelineComplete;

  return (
    <Page $hasResults={search.isPending || isPipelineRunning || pipelineComplete || search.isError}>
      <Greeting>{greeting}</Greeting>

      <GlowWrap>
        {DOT_CONFIG.map((d, i) => (
          <Dot key={i} $x={d.x} $y={d.y} $size={d.size} $delay={d.delay} $dur={d.dur} />
        ))}
        <UnifiedBar as="form" onSubmit={handleSubmit} ref={locRef} $morphing={search.isPending || isPipelineRunning}>
            <BarInput
              type="text"
              placeholder={t('search.keywordPlaceholder')}
              value={keyword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)}
              required
              autoFocus
            />
            <LocBadge type="button" onClick={() => setShowLocPicker(p => !p)}>
              <LocFlag>HK</LocFlag>
              {district === '全區' ? '全區' : district}
            </LocBadge>
            <NumberWrap style={{ marginRight: 4 }}>
              <NumberInput
                type="number"
                min={1}
                max={200}
                value={targetCount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetCount(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
              />
              <NumArrows>
                <NumArrowBtn type="button" onClick={() => setTargetCount(c => Math.min(200, c + 5))}>▲</NumArrowBtn>
                <NumArrowBtn type="button" onClick={() => setTargetCount(c => Math.max(1, c - 5))}>▼</NumArrowBtn>
              </NumArrows>
            </NumberWrap>
            <BarSearchBtn type="submit" disabled={search.isPending || !keyword.trim()}>
              {search.isPending ? <Spinner /> : <SearchBtnIcon />}
            </BarSearchBtn>
            {showLocPicker && (
              <LocDropdown>
                {HK_DISTRICTS.map(d => (
                  <LocOption key={d} $active={district === d} onClick={() => { setDistrict(d); setShowLocPicker(false); }}>
                    {d}
                  </LocOption>
                ))}
              </LocDropdown>
            )}
            {/* Progress ring overlay */}
            {(search.isPending || isPipelineRunning) && (
              <SearchRingWrap>
                <SearchRing $percent={pipelineProgress?.percent}>
                  <svg className="ring-svg" width="140" height="140" viewBox="0 0 140 140">
                    <circle cx="70" cy="70" r="62" fill="none" stroke="rgba(37,99,235,0.10)" strokeWidth="4" />
                    <circle
                      cx="70" cy="70" r="62"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 62}`}
                      strokeDashoffset={
                        pipelineProgress
                          ? `${2 * Math.PI * 62 * (1 - pipelineProgress.percent / 100)}`
                          : `${2 * Math.PI * 62 * 0.75}`
                      }
                      transform="rotate(-90 70 70)"
                      style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                    />
                  </svg>
                  <RingCount>
                    {pipelineProgress
                      ? `${pipelineProgress.current}/${pipelineProgress.total}`
                      : search.isPending ? '提交中' : '準備中'}
                  </RingCount>
                </SearchRing>
                {pipelineProgress && (
                  <RingStage>
                    {STAGE_LABELS[pipelineProgress.stage] || pipelineProgress.stage}
                  </RingStage>
                )}
                <RingHint>
                  {pipelineProgress
                    ? `${Math.round(pipelineProgress.percent)}% 完成`
                    : search.isPending ? '正在連線至搜尋引擎…' : '等待管道啟動…'}
                </RingHint>
              </SearchRingWrap>
            )}
          </UnifiedBar>
      </GlowWrap>

      {/* ── Pipeline progress + results ── */}
      {(search.isPending || isPipelineRunning || pipelineComplete || search.isError) && (
        <div style={{ width: 'calc(100% - 48px)', maxWidth: 760 }}>
          {/* Status banner — loading state handled by ring */}
          {search.isError && (
            <StatusBanner $type="error">搜尋失敗：{(search.error as any)?.message || '未知錯誤'}</StatusBanner>
          )}
          {isPipelineRunning && pipelineLogs.length > 0 && (
            <PipelineSection>
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
          )}

          {/* Complete → show results */}
          {pipelineComplete && (
            <PipelineSection>
              <StatusBanner $type="success">搜尋完成，共找到 {realResults.length} 筆結果</StatusBanner>

              {/* Result cards */}
              <ResultCardList>
                {realResults.map((lead, i) => (
                  <ResultCard key={i} onClick={() => lead._id && navigate(`/cms-leads?detail=${lead._id}`)}>
                    <RcAvatar $color={hashAvatarColor(lead.name)}>
                      {lead.name.slice(0, 1)}
                    </RcAvatar>
                    <RcBody>
                      <RcTopRow>
                        <RcName>{lead.name}</RcName>
                        {lead.rating > 0 && <RcStars>{renderStars(lead.rating)}</RcStars>}
                        {lead.rating > 0 && <RcRatingText>{lead.rating.toFixed(1)}</RcRatingText>}
                      </RcTopRow>
                      <RcMeta>{lead.address || '—'}</RcMeta>
                      <RcContactIcons>
                        <ContactIcon $has={lead.hasEmail} $color="#2563eb">
                          <SvgIcon d="M1 3.5h14v9H1z M1 3.5l7 5 7-5" size={12} /> {lead.hasEmail ? lead.email : ''}
                        </ContactIcon>
                        <ContactIcon $has={lead.hasPhone} $color="#16a34a">
                          <SvgIcon d="M3 1.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" size={12} /> {lead.hasPhone ? lead.phone : ''}
                        </ContactIcon>
                        <ContactIcon $has={lead.hasWebsite} $color="#d97706">
                          <SvgIcon d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1z M1 8h14 M8 1c-2 2-2 5 0 7s2 5 0 7" size={12} /> {lead.hasWebsite ? lead.website : ''}
                        </ContactIcon>
                      </RcContactIcons>
                    </RcBody>
                    <RcActions>
                      <RcStatusBadge $status={lead.status}>{STATUS_LABELS[lead.status] || lead.status}</RcStatusBadge>
                    </RcActions>
                  </ResultCard>
                ))}
                {realResults.length === 0 && <EmptyState>呢次搜尋冇搵到結果</EmptyState>}
              </ResultCardList>
            </PipelineSection>
          )}
        </div>
      )}

    </Page>
  );
};

export default SearchPage;
