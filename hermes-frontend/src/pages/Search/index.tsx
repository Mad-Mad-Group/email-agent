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
import { useBadge } from '../../contexts/BadgeContext';

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

const GREETING_KEYS = [
  'search.greeting1',
  'search.greeting2',
  'search.greeting3',
  'search.greeting4',
  'search.greeting5',
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

const UnifiedBar = styled.div<{ $morphing?: boolean; $glow?: boolean }>`
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

  ${({ $glow, $morphing }) => $glow && !$morphing && css`
    border-color: transparent;
    box-shadow: 0 0 10px rgba(255,107,107,0.2), 0 0 20px rgba(72,219,251,0.12), 0 0 30px rgba(255,159,243,0.08);
    &::before {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 999px;
      padding: 2px;
      background: conic-gradient(#ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff, #ff6b6b);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      animation: ${haloHue} 3s linear infinite;
      pointer-events: none;
    }
    &:focus-within {
      box-shadow: 0 0 14px rgba(255,107,107,0.25), 0 0 24px rgba(72,219,251,0.15), 0 0 36px rgba(255,159,243,0.1);
    }
  `}
`;

const BarInput = styled.input`
  flex: 1; min-width: 0;
  border: none; outline: none;
  padding: 18px 0 18px 12px;
  font-size: 1.05rem;
  ${media.mobile} { padding: 14px 0 14px 10px; font-size: 0.9375rem; }
  background: transparent;
  color: ${({ theme }) => theme.colors.textPrimary};
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; }
`;

const LocBadge = styled.button`
  display: flex; align-items: center; gap: 5px;
  padding: 6px 10px; margin: 0 4px;
  border: none; border-radius: 999px;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.8125rem; font-weight: 600;
  cursor: pointer; white-space: nowrap; flex-shrink: 0;
  transition: color 0.15s, background 0.15s;
  position: relative;
  &:hover { color: ${({ theme }) => theme.colors.textPrimary}; background: rgba(0,0,0,0.03); }
  &::after {
    content: ''; display: inline-block;
    width: 4px; height: 4px; margin-left: 1px;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: translateY(-1px) rotate(45deg);
    opacity: 0.35;
  }
`;

const MapPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6C3.5 9.5 8 14.5 8 14.5S12.5 9.5 12.5 6C12.5 3.5 10.5 1.5 8 1.5Z"/>
    <circle cx="8" cy="6" r="1.5"/>
  </svg>
);

const BarSearchBtn = styled.button`
  display: flex; align-items: center; justify-content: center;
  width: 46px; height: 46px; margin: 5px 6px 5px 0;
  border: none; border-radius: 50%;
  background: #0ea5e9; color: #fff;
  cursor: pointer; flex-shrink: 0;
  transition: background 0.15s, transform 0.15s;
  &:hover:not(:disabled) { background: #0369a1; transform: scale(1.06); }
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
  background: ${({ $active }) => $active ? '#e0f2fe' : 'transparent'};
  color: ${({ $active, theme }) => $active ? '#0369a1' : theme.colors.textSecondary};
  transition: background 0.12s;
  &:hover { background: ${({ $active }) => $active ? '#e0f2fe' : '#f1f5f9'}; }
`;

const haloHue = keyframes`
  from { filter: hue-rotate(0deg); }
  to { filter: hue-rotate(360deg); }
`;

const ModePill = styled.div`
  display: flex; align-items: center;
  border-radius: 18px; padding: 2px;
  background: ${({ theme }) => theme.colors.surfaceMuted || '#f1f5f9'};
  margin: 5px 0 5px 5px; flex-shrink: 0;
  position: relative;
  align-self: center;
`;

const ModeThumb = styled.div<{ $right: boolean }>`
  position: absolute;
  top: 2px; bottom: 2px; left: 2px;
  width: calc(50% - 2px);
  border-radius: 16px;
  background: ${({ $right }) => $right ? '#1a1a2e' : '#0ea5e9'};
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s;
  transform: translateX(${({ $right }) => $right ? '100%' : '0'});
  z-index: 0;

  ${({ $right }) => $right && css`
    box-shadow: 0 0 8px rgba(255,107,107,0.3), 0 0 14px rgba(72,219,251,0.15);
    &::before {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 999px;
      padding: 2px;
      background: conic-gradient(#ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff, #ff6b6b);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      animation: ${haloHue} 3s linear infinite;
      pointer-events: none;
    }
  `}
`;

const ModeOption = styled.button<{ $active: boolean }>`
  position: relative; z-index: 1;
  padding: 6px 12px; border: none; border-radius: 16px;
  background: transparent;
  font-size: 0.6875rem; font-weight: 600;
  cursor: pointer; white-space: nowrap;
  color: ${({ $active }) => $active ? '#fff' : 'inherit'};
  transition: color 0.25s;
`;

const HK_DISTRICT_KEYS = [
  'all', 'centralWestern', 'wanChai', 'eastern', 'southern',
  'yauTsimMong', 'shamShuiPo', 'kowloonCity', 'wongTaiSin', 'kwunTong',
  'kwaiTsing', 'tsuenWan', 'tuenMun', 'yuenLong', 'north', 'taiPo', 'shaTin', 'saiKung', 'islands',
];

/* API always sends Traditional Chinese district names regardless of UI locale */
const DISTRICT_API_VALUES: Record<string, string> = {
  all: '全區', centralWestern: '中西區', wanChai: '灣仔', eastern: '東區', southern: '南區',
  yauTsimMong: '油尖旺', shamShuiPo: '深水埗', kowloonCity: '九龍城', wongTaiSin: '黃大仙', kwunTong: '觀塘',
  kwaiTsing: '葵青', tsuenWan: '荃灣', tuenMun: '屯門', yuenLong: '元朗', north: '北區',
  taiPo: '大埔', shaTin: '沙田', saiKung: '西貢', islands: '離島',
};

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

/* 数字圆圈 */
const NumberWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 44px; height: 44px;
  border-radius: 50%;
  background: transparent;
  flex-shrink: 0;
  margin: 0 6px;
  gap: 0;
  position: relative;
  &::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 72px;
    height: 56px;
    border-radius: 50%;
    background: radial-gradient(ellipse at 50% 50%, rgba(37,99,235,0.10) 0%, rgba(37,99,235,0.05) 25%, rgba(37,99,235,0.02) 45%, rgba(37,99,235,0.005) 65%, transparent 85%);
    filter: blur(4px);
    pointer-events: none;
    z-index: -1;
  }
`;

const NumberInput = styled.input`
  width: 28px; padding: 0;
  border: none; border-radius: 0;
  font-size: 0.8125rem; font-weight: 700;
  text-align: center; line-height: 1;
  outline: none;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: transparent;
  -moz-appearance: textfield;
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
`;

const NumArrowBtn = styled.button`
  display: flex; align-items: center; justify-content: center;
  width: 24px; height: 12px;
  border: none; border-radius: 2px;
  background: transparent;
  color: ${({ theme }) => theme.colors.textTertiary};
  cursor: pointer; padding: 0;
  transition: color 0.15s;
  &:hover { color: ${({ theme }) => theme.colors.blue}; }
`;

const ChevronUp = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 5L5 1L9 5"/></svg>
);
const ChevronDown = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1L5 5L9 1"/></svg>
);

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
  background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 50%, #60a5fa 100%);
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
  border-left: 3px solid #0ea5e9;
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
    $status === 'qualified' ? '#0ea5e922' :
    $status === 'contacted' ? '#d9770622' :
    $status === 'rejected' ? '#dc262622' :
    '#0ea5e922'};
  color: ${({ $status }) =>
    $status === 'qualified' ? '#0ea5e9' :
    $status === 'contacted' ? '#94a3b8' :
    $status === 'rejected' ? '#dc2626' :
    '#0ea5e9'};
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
    border-color: #0ea5e9;
    color: #0ea5e9;
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
  border-image: linear-gradient(90deg, #0ea5e9, #8b5cf6, #ec4899) 1;
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
  border: 1px solid ${({ $active, theme }) => $active ? '#0ea5e9' : theme.colors.border};
  background: ${({ $active }) => $active ? '#0ea5e922' : 'transparent'};
  color: ${({ $active, theme }) => $active ? '#0ea5e9' : theme.colors.textSecondary};
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: #0ea5e9; color: #0ea5e9; }
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
    background: #0ea5e9;
    cursor: pointer;
  }
`;

const SourceChip = styled.button<{ $active: boolean; $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 99px;
  border: 1px solid ${({ $active, $color, theme }) => $active ? ($color || '#0ea5e9') : theme.colors.border};
  background: ${({ $active, $color }) => $active ? `${$color || '#0ea5e9'}22` : 'transparent'};
  color: ${({ $active, $color, theme }) => $active ? ($color || '#0ea5e9') : theme.colors.textSecondary};
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: ${({ $color }) => $color || '#0ea5e9'}; color: ${({ $color }) => $color || '#0ea5e9'}; }
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
  color: ${({ $has, $color }) => $has ? ($color || '#0ea5e9') : '#cbd5e1'};
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
  background: #0ea5e922;
  color: #0ea5e9;
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

/* ── Pipeline Stepper ── */

const PIPELINE_STAGES = ['search', 'enrich', 'analyze', 'draft', 'send'] as const;
const PIPELINE_STAGE_NUMS: Record<string, number> = {
  search: 1, enrich: 2, analyze: 3, draft: 4, send: 5,
};
const PIPELINE_STAGE_I18N_KEYS: Record<string, string> = {
  search: 'search.pipelineSearch', enrich: 'search.pipelineEnrich', analyze: 'search.pipelineAnalyze', draft: 'search.pipelineDraft', send: 'search.pipelineSend',
};

const stepPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(14,165,233,0.4); }
  50% { box-shadow: 0 0 0 8px rgba(14,165,233,0); }
`;

const StepperWrap = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 0;
  padding: 12px 0 4px;
  width: 100%;
`;

const StepItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 64px;
`;

const StepCircle = styled.div<{ $state: 'done' | 'active' | 'pending' }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  flex-shrink: 0;
  transition: all 0.3s;
  background: ${({ $state }) =>
    $state === 'done' ? '#22c55e' :
    $state === 'active' ? '#0ea5e9' :
    '#e2e8f0'};
  color: ${({ $state }) => $state === 'pending' ? '#94a3b8' : '#fff'};
  ${({ $state }) => $state === 'active' && css`
    animation: ${stepPulse} 2s ease-in-out infinite;
  `}
`;

const StepLine = styled.div<{ $done: boolean }>`
  flex: 1;
  height: 3px;
  min-width: 28px;
  max-width: 72px;
  margin-top: 20px;
  border-radius: 2px;
  background: ${({ $done }) => $done ? '#22c55e' : '#e2e8f0'};
  transition: background 0.3s;
`;

const StepLabel = styled.div<{ $state: 'done' | 'active' | 'pending' }>`
  font-size: 0.8125rem;
  font-weight: 600;
  text-align: center;
  color: ${({ $state }) =>
    $state === 'active' ? '#0ea5e9' :
    $state === 'done' ? '#22c55e' :
    '#94a3b8'};
  transition: color 0.3s;
`;

const LeadCounter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 0 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const LeadCountNum = styled.span`
  color: #0ea5e9;
  font-size: 1rem;
  font-weight: 700;
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
  background: #0ea5e9;
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
  border-top-color: #0ea5e9;
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
  color: #0ea5e9;
  font-weight: 600;
  margin-right: 6px;
`;

const STAGE_LABEL_I18N_KEYS: Record<string, string> = {
  search: 'search.stageSearching',
  'search→enrich': 'search.stageStartEnrich',
  enrich: 'search.stageEnriching',
  analyze: 'search.stageAnalyzing',
  draft: 'search.stageDrafting',
  send: 'search.stageSending',
  pipeline: 'search.stageProcessing',
  complete: 'search.stageComplete',
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
  business: '#0ea5e9',
  person: '#0ea5e9',
  place: '#d97706',
  default: '#0ea5e9',
};

function getResultTitle(row: Record<string, unknown>): string {
  const candidates = ['name', 'title', 'company_name', 'company', 'business_name', 'label'];
  for (const key of candidates) {
    if (row[key] && typeof row[key] === 'string') return row[key] as string;
  }
  const firstString = Object.values(row).find(v => typeof v === 'string' && (v as string).length > 0);
  return firstString ? String(firstString) : '—';
}

function getResultType(row: Record<string, unknown>): string {
  const candidates = ['type', 'category', 'source', 'kind'];
  for (const key of candidates) {
    if (row[key] && typeof row[key] === 'string') return row[key] as string;
  }
  return '—';
}

function getResultPreview(row: Record<string, unknown>): string {
  const candidates = ['description', 'snippet', 'content', 'summary', 'text', 'address', 'details'];
  for (const key of candidates) {
    if (row[key] && typeof row[key] === 'string') return row[key] as string;
  }
  return JSON.stringify(row, null, 2);
}

/* MOCK_RELATED keys — titles are i18n'd via search.relatedNearby / relatedBusiness / relatedIndustry */
const MOCK_RELATED_KEYS = [
  { titleKey: 'search.relatedNearby', type: 'location', color: '#0ea5e9' },
  { titleKey: 'search.relatedBusiness', type: 'business', color: '#0ea5e9' },
  { titleKey: 'search.relatedIndustry', type: 'industry', color: '#d97706' },
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
  { name: '宏達水電行', phone: '02-2720-1234', address: '台北市信義區松仁路100號', rating: 4.5, reviews: 128, source: 'Google Maps', status: 'new', color: '#0ea5e9', hasEmail: true, hasPhone: true, hasWebsite: true, email: 'info@hongda.com.tw', website: 'hongda.com.tw' },
  { name: '永豐水電工程', phone: '02-2705-5678', address: '台北市大安區復興南路200號', rating: 4.2, reviews: 85, source: 'Google Maps', status: 'new', color: '#0ea5e9', hasEmail: false, hasPhone: true, hasWebsite: false },
  { name: '大同水電維修', phone: '02-2562-9012', address: '台北市中山區南京東路50號', rating: 4.8, reviews: 203, source: 'Google Maps', status: 'contacted', color: '#d97706', hasEmail: true, hasPhone: true, hasWebsite: true, email: 'service@datong-water.tw', website: 'datong-water.tw' },
  { name: '建成水電服務', phone: '02-2302-3456', address: '台北市萬華區西園路88號', rating: 3.9, reviews: 42, source: 'LinkedIn', status: 'new', color: '#0369a1', hasEmail: true, hasPhone: true, hasWebsite: false, email: 'jiancheng.plumb@gmail.com' },
  { name: '信義水電急修', phone: '02-2579-7890', address: '台北市松山區八德路300號', rating: 4.6, reviews: 156, source: 'Google Maps', status: 'qualified', color: '#0ea5e9', hasEmail: true, hasPhone: true, hasWebsite: true, email: 'contact@xinyi-fix.com', website: 'xinyi-fix.com' },
  { name: '台北水電到府', phone: '02-2771-2345', address: '台北市大安區忠孝東路四段120號', rating: 4.1, reviews: 67, source: 'LinkedIn', status: 'new', color: '#dc2626', hasEmail: false, hasPhone: true, hasWebsite: true, website: 'taipei-plumber.tw' },
  { name: '全能水電工程行', phone: '02-2391-6789', address: '台北市中正區重慶南路一段80號', rating: 4.4, reviews: 112, source: 'Google Maps', status: 'new', color: '#0ea5e9', hasEmail: true, hasPhone: true, hasWebsite: false, email: 'allpower@gmail.com' },
  { name: '北投水電材料行', phone: '02-2893-0123', address: '台北市北投區中央南路一段45號', rating: 3.7, reviews: 31, source: '104人力銀行', status: 'rejected', color: '#94a3b8', hasEmail: false, hasPhone: true, hasWebsite: false },
];

const STATUS_LABEL_I18N_KEYS: Record<string, string> = {
  new: 'search.statusNew',
  contacted: 'search.statusContacted',
  qualified: 'search.statusQualified',
  rejected: 'search.statusRejected',
};

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
}

const SearchPage: React.FC = () => {
  const { t } = useTranslation();
  const { setBadge } = useBadge();
  const [greetingKey] = useState(() => GREETING_KEYS[Math.floor(Math.random() * GREETING_KEYS.length)]);
  // ponytail: restore form state from localStorage so refresh doesn't wipe it.
  // Falls back to defaults if key missing or JSON corrupt.
  const readSavedForm = (): { kw: string; loc: string; dist: string; tc: number } => {
    try {
      const raw = localStorage.getItem('search-form');
      if (raw) {
        const j = JSON.parse(raw);
        if (typeof j.kw === 'string') {
          // Migrate old Chinese district values to keys
          if (j.dist && !HK_DISTRICT_KEYS.includes(j.dist)) j.dist = 'all';
          return j;
        }
      }
    } catch { /* ignore corrupt localStorage */ }
    return { kw: '', loc: t('search.defaultLocation'), dist: 'all', tc: 20 };
  };
  const saved = readSavedForm();
  const [keyword, setKeyword] = useState(saved.kw);
  const [location, setLocation] = useState(saved.loc);
  const [district, setDistrict] = useState(saved.dist);
  const [showLocPicker, setShowLocPicker] = useState(false);
  const [targetCount, setTargetCount] = useState(saved.tc);
  const [searchMode, setSearchMode] = useState<'normal' | 'old_website'>('normal');
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
        new Notification(t('search.notificationTitle'), {
          body: t('search.notificationBody', { count: leadCount }),
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
    name: lead.company_name || t('search.unknownCompany'),
    phone: lead.phone || '',
    address: lead.address || '',
    rating: lead.rating ? parseFloat(lead.rating) : 0,
    reviews: 0,
    source: lead.source || 'MADMAD',
    status: lead.status || 'new',
    color: '#0ea5e9',
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
          /* Update sidebar badges with new result counts */
          if (mapped.length > 0) {
            setBadge('/cms-leads', mapped.length);
          }
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
      setLocation(t('search.defaultLocation'));
      setDistrict('all');
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
    // 喺 user gesture 內請求通知權限，確保瀏覽器唔會靜靜忽略
    void ensureNotificationPermission();
    const districtApiName = DISTRICT_API_VALUES[district] || '';
    const fullLocation = district === 'all' ? location : `${location} ${districtApiName}`;
    const payload: SearchPayload = {
      keyword: keyword.trim(),
      location: fullLocation.trim(),
      targetCount,
      mode: searchMode,
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
      <Greeting>{t(greetingKey)}</Greeting>

      <GlowWrap>
        {DOT_CONFIG.map((d, i) => (
          <Dot key={i} $x={d.x} $y={d.y} $size={d.size} $delay={d.delay} $dur={d.dur} />
        ))}
        <UnifiedBar as="form" onSubmit={handleSubmit} ref={locRef} $morphing={search.isPending || isPipelineRunning} $glow={searchMode === 'old_website'}>
            <ModePill>
              <ModeThumb $right={searchMode === 'old_website'} />
              <ModeOption type="button" $active={searchMode === 'normal'} onClick={() => setSearchMode('normal')}>{t('search.modeNormal')}</ModeOption>
              <ModeOption type="button" $active={searchMode === 'old_website'} onClick={() => setSearchMode('old_website')}>{t('search.modeOldSite')}</ModeOption>
            </ModePill>
            <BarInput
              type="text"
              placeholder={t('search.keywordPlaceholder')}
              value={keyword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)}
              required
              autoFocus
            />
            <LocBadge type="button" onClick={() => setShowLocPicker(p => !p)}>
              <MapPinIcon />
              {t(`search.dist_${district}`)}
            </LocBadge>
            <NumberWrap>
              <NumArrowBtn type="button" onClick={() => setTargetCount(c => Math.min(200, c + 5))}><ChevronUp /></NumArrowBtn>
              <NumberInput
                type="number"
                min={1}
                max={200}
                value={targetCount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetCount(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
              />
              <NumArrowBtn type="button" onClick={() => setTargetCount(c => Math.max(1, c - 5))}><ChevronDown /></NumArrowBtn>
            </NumberWrap>
            <BarSearchBtn type="submit" disabled={search.isPending || !keyword.trim()}>
              {search.isPending ? <Spinner /> : <SearchBtnIcon />}
            </BarSearchBtn>
            {showLocPicker && (
              <LocDropdown>
                {HK_DISTRICT_KEYS.map(dk => (
                  <LocOption key={dk} $active={district === dk} onClick={() => { setDistrict(dk); setShowLocPicker(false); }}>
                    {t(`search.dist_${dk}`)}
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
                      stroke="#0ea5e9"
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
                      : search.isPending ? t('search.submitting') : t('search.preparing')}
                  </RingCount>
                </SearchRing>
                {pipelineProgress && (
                  <RingStage>
                    {STAGE_LABEL_I18N_KEYS[pipelineProgress.stage] ? t(STAGE_LABEL_I18N_KEYS[pipelineProgress.stage]) : pipelineProgress.stage}
                  </RingStage>
                )}
                <RingHint>
                  {pipelineProgress
                    ? t('search.percentComplete', { percent: Math.round(pipelineProgress.percent) })
                    : search.isPending ? t('search.connectingToEngine') : t('search.waitingForPipeline')}
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
            <StatusBanner $type="error">{t('search.searchFailedWithMessage', { message: (search.error as any)?.message || t('search.unknownError') })}</StatusBanner>
          )}
          {isPipelineRunning && (
            <PipelineSection>
              {/* Stepper */}
              <StepperWrap>
                {PIPELINE_STAGES.map((stage, i) => {
                  const currentIdx = pipelineProgress
                    ? PIPELINE_STAGES.indexOf(pipelineProgress.stage as typeof PIPELINE_STAGES[number])
                    : -1;
                  const state: 'done' | 'active' | 'pending' =
                    i < currentIdx ? 'done' :
                    i === currentIdx ? 'active' :
                    'pending';
                  return (
                    <React.Fragment key={stage}>
                      {i > 0 && <StepLine $done={i <= currentIdx} />}
                      <StepItem>
                        <StepCircle $state={state}>
                          {state === 'done' ? '✓' : PIPELINE_STAGE_NUMS[stage]}
                        </StepCircle>
                        <StepLabel $state={state}>{t(PIPELINE_STAGE_I18N_KEYS[stage])}</StepLabel>
                      </StepItem>
                    </React.Fragment>
                  );
                })}
              </StepperWrap>

              {/* Lead counter */}
              {pipelineProgress && pipelineProgress.total > 0 && (
                <LeadCounter>
                  {t('search.foundLeadsBefore')} <LeadCountNum>{pipelineProgress.current}</LeadCountNum> / {pipelineProgress.total} {t('search.foundLeadsAfter')}
                </LeadCounter>
              )}

              {/* Log feed */}
              {pipelineLogs.length > 0 && (
                <PipelineLogFeed ref={pipelineLogRef}>
                  {pipelineLogs.map((log, i) => (
                    <PipelineLogLine key={i} $level={log.level}>
                      <PipelineLogTime>[{log.time}]</PipelineLogTime>
                      {log.stage && <PipelineLogStage>[{STAGE_LABEL_I18N_KEYS[log.stage] ? t(STAGE_LABEL_I18N_KEYS[log.stage]) : log.stage}]</PipelineLogStage>}
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
              <StatusBanner $type="success">{t('search.searchCompleteWithCount', { count: realResults.length })}</StatusBanner>

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
                        <ContactIcon $has={lead.hasEmail} $color="#0ea5e9">
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
                      <RcStatusBadge $status={lead.status}>{STATUS_LABEL_I18N_KEYS[lead.status] ? t(STATUS_LABEL_I18N_KEYS[lead.status]) : lead.status}</RcStatusBadge>
                    </RcActions>
                  </ResultCard>
                ))}
                {realResults.length === 0 && <EmptyState>{t('search.noSearchResults')}</EmptyState>}
              </ResultCardList>
            </PipelineSection>
          )}
        </div>
      )}

    </Page>
  );
};

export default SearchPage;
