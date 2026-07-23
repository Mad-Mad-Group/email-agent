import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled, { keyframes, css, useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../../api/hooks';
import { SearchPayload, hermesApi } from '../../api/services';
import { sseClient, SSEEvent } from '../../api/sse';
import { leadsApi, Lead } from '../../api/leads';
import { media } from '../../styles/media';
import { glassSurface } from '../../styles/glassSurface';
import { useBadge } from '../../contexts/BadgeContext';
import SpriteAvatar from '../../components/SpriteAvatar';
import LeadDetailPanel from '../../components/LeadDetailPanel';
import LeadEmails from '../../components/LeadEmails';
import { AGENTS, FARMER } from '../../config/agents';

/* ══════════════════════════════════════
   CMS Search — LUNO-style UI
   ══════════════════════════════════════ */

/* ── Avatar helper ── */
const avatarPalette = ['#EFEAE3', '#E8E3DB', '#E2DDD5', '#F5F2ED'];
function hashAvatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return avatarPalette[Math.abs(h) % avatarPalette.length];
}

/* ── Layout primitives ── */

const Page = styled.div<{ $hasResults?: boolean }>`
  position: relative;
  display: flex; flex-direction: column; align-items: center;
  justify-content: ${({ $hasResults }) => $hasResults ? 'flex-start' : 'center'};
  min-height: calc(100vh - 64px); gap: ${({ $hasResults }) => $hasResults ? '16px' : '20px'};
  padding-bottom: ${({ $hasResults }) => $hasResults ? '40px' : '0'};
  padding-top: ${({ $hasResults }) => $hasResults ? '40px' : '0'};
  overflow: hidden;
`;

const GREETING_KEYS = [
  'search.greeting1',
  'search.greeting2',
  'search.greeting3',
  'search.greeting4',
  'search.greeting5',
];

const Greeting = styled.p`
  margin: 0;
  font-size: clamp(1.25rem, 4vw, 2rem);
  font-weight: 300;
  color: ${({ theme }) => theme.colors.textPrimary};
  text-align: center;
  letter-spacing: 0.01em;
  padding: 0 24px;
`;

/* ── Orbital Planet Animation ── */

const orbitSpin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const OrbitalHero = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(70vmin, 800px);
  height: min(70vmin, 800px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 0;
  pointer-events: none;

  /* radial glow from center */
  &::before {
    content: '';
    position: absolute;
    width: 50%;
    height: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(
      circle,
      ${({ theme }) => theme.colors.accent}18 0%,
      ${({ theme }) => theme.colors.accent}0c 35%,
      ${({ theme }) => theme.colors.accent}06 60%,
      transparent 100%
    );
    filter: blur(30px);
    pointer-events: none;
  }
`;

const OrbitPath = styled.div<{ $frac: number; $dur: number; $reverse?: boolean }>`
  position: absolute;
  width: ${({ $frac }) => $frac * 100}%;
  height: ${({ $frac }) => $frac * 100}%;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  animation: ${orbitSpin} ${({ $dur }) => $dur}s linear infinite;
  ${({ $reverse }) => $reverse && 'animation-direction: reverse;'}
`;

const OrbitNodeWrap = styled.div<{ $dur: number; $reverse?: boolean }>`
  position: absolute;
  transform: translate(-50%, -50%);
  animation: ${orbitSpin} ${({ $dur }) => $dur}s linear infinite;
  animation-direction: ${({ $reverse }) => $reverse ? 'normal' : 'reverse'};
`;

const OrbitAvatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${({ theme }) => theme.shadows.card};
  overflow: hidden;
  border: 2px solid ${({ theme }) => theme.colors.border};
  ${media.mobile} { width: 34px; height: 34px; }
`;

const OrbitDot = styled.div<{ $color: string; $s: number }>`
  width: ${({ $s }) => $s}px;
  height: ${({ $s }) => $s}px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 ${({ $s }) => $s * 2}px ${({ $color }) => $color}55;
`;

const GradientGreeting = styled.h1`
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-weight: 800;
  text-align: center;
  line-height: 1.35;
  background: ${({ theme }) => theme.gradients.brand};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  max-width: 300px;
  margin: 0;
  z-index: 2;
  position: relative;
  ${media.mobile} {
    max-width: 260px;
    font-size: clamp(1.2rem, 5vw, 2rem);
  }
`;

/* Orbit config — 6 rings, fraction of hero size */
const ORBIT_RINGS = [
  { frac: 0.20, dur: 25, reverse: false },
  { frac: 0.34, dur: 35, reverse: true },
  { frac: 0.50, dur: 50, reverse: false },
  { frac: 0.67, dur: 70, reverse: true },
  { frac: 0.83, dur: 90, reverse: false },
  { frac: 0.97, dur: 120, reverse: true },
];

const orbitNodePos = (angle: number) => ({
  top: `${50 - 50 * Math.cos(angle * Math.PI / 180)}%`,
  left: `${50 + 50 * Math.sin(angle * Math.PI / 180)}%`,
});

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
  z-index: 2;
  max-width: 760px;
  width: calc(100% - 48px);
  ${media.mobile} { width: calc(100% - 32px); }

  /* soft halo behind the bar */
  &::before {
    content: '';
    position: absolute;
    inset: -40px -60px;
    border-radius: 28px;
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
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const CardBody = styled.div`padding: 20px;`;

/* ── Form ── */

/* ── Unified Search Bar ── */

const UnifiedBar = styled.div<{ $morphing?: boolean; $glow?: boolean }>`
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  border: 1.5px solid ${({ theme, $morphing }) => $morphing ? 'transparent' : theme.colors.border};
  background: ${({ theme, $morphing }) => $morphing ? 'transparent' : theme.colors.surface};
  box-shadow: ${({ $morphing }) => $morphing ? 'none' : '0 2px 12px rgba(15,23,42,0.06)'};
  overflow: visible; position: relative;
  z-index: 1;

  /* morph transition */
  width: ${({ $morphing }) => $morphing ? '144px' : '100%'};
  height: ${({ $morphing }) => $morphing ? '144px' : 'auto'};
  margin: ${({ $morphing }) => $morphing ? '0 auto' : '0'};
  border-radius: ${({ $morphing }) => $morphing ? '50%' : '20px'};
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1),
              height 0.5s cubic-bezier(0.4, 0, 0.2, 1),
              margin 0.5s cubic-bezier(0.4, 0, 0.2, 1),
              border-radius 0.5s cubic-bezier(0.4, 0, 0.2, 1),
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
    border-color: ${({ theme, $morphing }) => $morphing ? 'transparent' : theme.colors.accent};
    box-shadow: ${({ $morphing }) => $morphing ? 'none' : '0 2px 20px rgba(37,99,235,0.12)'};
  }

  ${media.mobile} {
    border-radius: ${({ $morphing }) => $morphing ? '50%' : '16px'};
    padding: ${({ $morphing }) => $morphing ? '0' : '0'};
  }

  ${({ $glow, $morphing }) => $glow && !$morphing && css`
    border-color: transparent;
    box-shadow: 0 0 10px rgba(255,107,107,0.2), 0 0 20px rgba(72,219,251,0.12), 0 0 30px rgba(255,159,243,0.08);
    &::before {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 20px;
      padding: 2px;
      background: conic-gradient(${({ theme }) => theme.strong.mauve}, ${({ theme }) => theme.strong.gold}, ${({ theme }) => theme.colors.accent}, ${({ theme }) => theme.colors.accent}, ${({ theme }) => theme.colors.accent}, ${({ theme }) => theme.strong.mauve});
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
  width: 100%; min-width: 0;
  border: none; outline: none;
  padding: 14px 16px;
  font-size: 1.05rem;
  border-radius: 0;
  ${media.mobile} {
    padding: 10px 12px;
    font-size: 0.9375rem;
  }
  background: transparent;
  color: ${({ theme }) => theme.colors.textPrimary};
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; }
`;

const BarToolRow = styled.div`
  display: flex;
  align-items: center;
  padding: 4px 6px;
  gap: 2px;
  ${media.mobile} {
    padding: 4px;
    gap: 2px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
`;

const LocInputWrap = styled.div`
  display: flex; align-items: center; gap: 5px;
  margin-left: auto; flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1.5px solid ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.textSecondary};
  transition: background 0.15s;
  &:focus-within {
    background: rgba(0,0,0,0.03);
    color: ${({ theme }) => theme.colors.textPrimary};
  }
  ${media.mobile} { margin: 0; padding: 3px 6px; }
`;

const LocInput = styled.input`
  border: none; outline: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.8125rem; font-weight: 600;
  width: 120px;
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; font-weight: 400; }
  ${media.mobile} { width: 80px; font-size: 0.6875rem; }
`;

const MapPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6C3.5 9.5 8 14.5 8 14.5S12.5 9.5 12.5 6C12.5 3.5 10.5 1.5 8 1.5Z"/>
    <circle cx="8" cy="6" r="1.5"/>
  </svg>
);

const BarSearchBtn = styled.button`
  display: flex; align-items: center; justify-content: center;
  width: 38px; height: 38px;
  border: none; border-radius: 50%;
  background: ${({ theme }) => theme.colors.accent}; color: ${({ theme }) => theme.colors.textInverted};
  cursor: pointer; flex-shrink: 0;
  transition: background 0.15s, transform 0.15s;
  &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.accent}; transform: scale(1.06); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  ${media.mobile} { width: 34px; height: 34px; }
`;


const haloHue = keyframes`
  from { filter: hue-rotate(0deg); }
  to { filter: hue-rotate(360deg); }
`;

/* ── Claude-style mode/source picker ── */

const ModePickerWrap = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const ModePickerTrigger = styled.button<{ $color?: string }>`
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: ${({ $color, theme }) => $color || theme.colors.textPrimary};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.875rem; font-weight: 400;
  cursor: pointer; white-space: nowrap;
  transition: background 0.15s;
  &:hover { background: ${({ theme }) => theme.colors.surfaceMuted}; }
  &::after {
    content: '';
    display: inline-block;
    width: 5px; height: 5px;
    border-right: 1.5px solid ${({ theme }) => theme.colors.textTertiary};
    border-bottom: 1.5px solid ${({ theme }) => theme.colors.textTertiary};
    transform: translateY(-1px) rotate(45deg);
    margin-left: 2px;
  }
  ${media.mobile} { padding: 5px 8px; font-size: 0.8125rem; }
`;

const ModePickerDropdown = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 260px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(15,23,42,0.14);
  padding: 6px;
  z-index: 200;
  animation: modeDropIn 0.15s ease-out;
  @keyframes modeDropIn {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

const ModePickerItem = styled.button<{ $active: boolean; $color?: string }>`
  display: flex; align-items: flex-start; gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  background: ${({ $active, $color, theme }) => $active ? ($color || theme.colors.accent) + '12' : 'transparent'};
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
  &:hover { background: ${({ $active, $color, theme }) => $active ? ($color || theme.colors.accent) + '1a' : theme.colors.surfaceMuted}; }
`;

const ModeItemCheck = styled.span<{ $active: boolean; $color?: string }>`
  display: flex; align-items: center; justify-content: center;
  width: 18px; height: 18px;
  border-radius: 50%;
  border: 1.5px solid ${({ $active, $color, theme }) => $active ? ($color || theme.colors.accent) : theme.colors.border};
  background: ${({ $active, $color, theme }) => $active ? ($color || theme.colors.accent) : 'transparent'};
  flex-shrink: 0;
  margin-top: 1px;
  transition: all 0.15s;
  color: #fff;
  font-size: 10px;
`;

const ModeItemText = styled.div`
  display: flex; flex-direction: column; gap: 2px; min-width: 0;
`;

const ModeItemLabel = styled.span<{ $color?: string }>`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.8125rem; font-weight: 400;
  color: ${({ $color, theme }) => $color || theme.colors.textPrimary};
`;

const ModeItemDesc = styled.span`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  line-height: 1.35;
`;

interface ModeConfig {
  key: string;
  label?: string;
  labelKey?: string;
  descKey: string;
  apiMode: 'normal' | 'old_website';
  color?: string;
}

/* Google logo letter colors */
const GOOGLE_COLORS = ['#4285F4','#EA4335','#FBBC05','#4285F4','#34A853','#EA4335'];
const GoogleText: React.FC<{ suffix: string; icon?: React.ReactNode }> = ({ suffix, icon }) => (
  <span>
    {'Google'.split('').map((ch, i) => (
      <span key={i} style={{ color: GOOGLE_COLORS[i] }}>{ch}</span>
    ))}
    <span>{suffix}</span>
    {icon}
  </span>
);

/* LinkedIn brand text: "Linked" + "in" box */
const LinkedInText: React.FC = () => (
  <span style={{ color: '#0A66C2' }}>
    Linked<span style={{
      background: '#0A66C2', color: '#fff',
      borderRadius: 3, padding: '0 2px', marginLeft: 0.5,
    }}>in</span>
  </span>
);

/* Inline SVG icons for mode labels */
const SearchIcon: React.FC<{ color?: string }> = ({ color }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={color || 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, verticalAlign: '-2px', marginLeft: 3 }}>
    <circle cx="7" cy="7" r="5" /><path d="M11 11L14.5 14.5" />
  </svg>
);

const MapIcon: React.FC<{ color?: string }> = ({ color }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={color || 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, verticalAlign: '-2px', marginLeft: 3 }}>
    <path d="M1 3.5L5.5 1.5L10.5 3.5L15 1.5V12.5L10.5 14.5L5.5 12.5L1 14.5Z" />
    <path d="M5.5 1.5V12.5" /><path d="M10.5 3.5V14.5" />
  </svg>
);

const WebsiteIcon: React.FC<{ color?: string }> = ({ color }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={color || 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, verticalAlign: '-2px', marginLeft: 3 }}>
    <circle cx="8" cy="8" r="7" />
    <path d="M1 8h14" /><path d="M8 1c-2.5 2.5-2.5 5 0 7s2.5 5 0 7" /><path d="M8 1c2.5 2.5 2.5 5 0 7s-2.5 5 0 7" />
  </svg>
);

const MODE_CONFIGS: ModeConfig[] = [
  { key: 'normal',        label: 'Google Maps',  descKey: 'search.modeGoogleMapsDesc',  apiMode: 'normal',      color: '#4285F4' },
  { key: 'old_website',   labelKey: 'search.modeOldSite', descKey: 'search.modeOldSiteDesc', apiMode: 'old_website', color: '#A0784C' },
  { key: 'google_search', label: 'Google Search', descKey: 'search.modeGoogleSearchDesc', apiMode: 'normal',      color: '#4285F4' },
  { key: 'linkedin',      label: 'LinkedIn',      descKey: 'search.modeLinkedInDesc',     apiMode: 'normal',      color: '#0A66C2' },
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
  ${glassSurface};
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
    border-bottom-color: ${({ theme }) => theme.colors.accent};
    background: radial-gradient(ellipse 70% 32px at 50% calc(100% + 2px), rgba(37,99,235,0.18) 0%, rgba(37,99,235,0.06) 50%, transparent 100%);
  }
`;

const FieldLabel = styled.label`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.accent};
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
  margin: 0 4px;
  gap: 0;
  position: relative;
  ${media.mobile} { width: 32px; height: 32px; margin: 0 2px; }
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
  &:hover { color: ${({ theme }) => theme.colors.accent}; }
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
  background: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.textInverted};
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
  background: ${({ theme }) => theme.colors.accent};
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
  color: ${({ theme }) => theme.colors.accent};
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
    $type === 'success' ? `${theme.strong.olive}0d`
    : $type === 'error' ? `${theme.strong.mauve}0d`
    : `${theme.colors.accent}0d`};
  color: ${({ $type, theme }) =>
    $type === 'success' ? theme.strong.olive
    : $type === 'error' ? theme.strong.mauve
    : theme.colors.accent};
  border: 1px solid ${({ $type, theme }) =>
    $type === 'success' ? `${theme.strong.olive}33`
    : $type === 'error' ? `${theme.strong.mauve}33`
    : `${theme.colors.accent}33`};
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
  ${media.mobile} { max-height: none; gap: 6px; margin-top: 8px; }
`;

const ResultCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ theme }) => theme.colors.accent};
  background: ${({ theme }) => theme.colors.surface};
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    box-shadow: 0 2px 8px rgba(15,23,42,0.07);
    transform: translateY(-1px);
  }
  ${media.mobile} {
    flex-wrap: wrap;
    padding: 10px 12px;
    gap: 8px;
  }
`;

const RcAvatar = styled.div<{ $color: string }>`
  width: 36px; height: 36px;
  border-radius: 8px;
  background: ${({ $color }) => $color};
  color: ${({ theme }) => theme.colors.textPrimary};
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
  color: ${({ theme }) => theme.strong.gold}; font-size: 0.6875rem; flex-shrink: 0;
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
  font-size: 0.75rem; color: ${({ theme }) => theme.strong.olive}; font-weight: 500;
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
  background: ${({ $status, theme }) =>
    $status === 'qualified' ? theme.colors.accent + '22' :
    $status === 'contacted' ? (theme.status?.contacted?.bg || theme.strong.gold + '22') :
    $status === 'rejected' ? theme.strong.mauve + '22' :
    theme.colors.accent + '22'};
  color: ${({ $status, theme }) =>
    $status === 'qualified' ? theme.colors.accent :
    $status === 'contacted' ? theme.colors.textTertiary :
    $status === 'rejected' ? theme.strong.mauve :
    theme.colors.accent};
`;

const RcActions = styled.div`
  display: flex; flex-direction: column; align-items: flex-end;
  gap: 6px; flex-shrink: 0;
  ${media.mobile} {
    flex-direction: row;
    width: 100%;
    justify-content: flex-end;
  }
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
    border-color: ${({ theme }) => theme.colors.accent};
    color: ${({ theme }) => theme.colors.accent};
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
    color: ${({ theme }) => theme.colors.accent}; pointer-events: none;
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
  background: ${({ theme }) => theme.colors.surfaceMuted};
  border-radius: 8px;
  border-bottom: 2px solid transparent;
  border-image: ${({ theme }) => theme.gradients.brand} 1;
  border-image-slice: 1;
  border-top: none;
  border-left: none;
  border-right: none;
  ${media.mobile} { gap: 6px; padding: 6px 8px; }
`;

const FilterToggle = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 99px;
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.accent : theme.colors.border};
  background: ${({ $active, theme }) => $active ? theme.colors.accent + '22' : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.accent : theme.colors.textSecondary};
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: ${({ theme }) => theme.colors.accent}; color: ${({ theme }) => theme.colors.accent}; }
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
    background: ${({ theme }) => theme.colors.accent};
    cursor: pointer;
  }
`;

const SourceChip = styled.button<{ $active: boolean; $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 99px;
  border: 1px solid ${({ $active, $color, theme }) => $active ? ($color || theme.colors.accent) : theme.colors.border};
  background: ${({ $active, $color, theme }) => $active ? `${$color || theme.colors.accent}22` : 'transparent'};
  color: ${({ $active, $color, theme }) => $active ? ($color || theme.colors.accent) : theme.colors.textSecondary};
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: ${({ $color, theme }) => $color || theme.colors.accent}; color: ${({ $color, theme }) => $color || theme.colors.accent}; }
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
  color: ${({ $has, $color, theme }) => $has ? ($color || theme.colors.accent) : theme.colors.border};
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
  background: ${({ theme }) => theme.colors.accent}22;
  color: ${({ theme }) => theme.colors.accent};
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
  color: ${({ theme }) => theme.colors.accent};
  flex-shrink: 0;
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.accent + '15'};
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
  color: ${({ theme }) => theme.colors.textInverted};
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
    $variant === 'primary' ? theme.colors.accent : theme.colors.surfaceMuted};
  color: ${({ $variant, theme }) =>
    $variant === 'primary' ? theme.colors.textInverted : 'inherit'};
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
  ${media.mobile} { padding: 8px 0 2px; }
`;

const StepItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 64px;
  ${media.mobile} { min-width: 0; gap: 3px; }
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
  background: ${({ $state, theme }) =>
    $state === 'done' ? theme.strong.olive :
    $state === 'active' ? theme.colors.accent :
    theme.colors.border};
  color: ${({ $state, theme }) => $state === 'pending' ? theme.colors.textTertiary : theme.colors.textInverted};
  ${({ $state }) => $state === 'active' && css`
    animation: ${stepPulse} 2s ease-in-out infinite;
  `}
  ${media.tablet} { width: 36px; height: 36px; font-size: 0.875rem; }
  ${media.mobile} { width: 30px; height: 30px; font-size: 0.75rem; }
`;

const StepLine = styled.div<{ $done: boolean }>`
  flex: 1;
  height: 3px;
  min-width: 28px;
  max-width: 72px;
  margin-top: 20px;
  border-radius: 2px;
  background: ${({ $done, theme }) => $done ? theme.strong.olive : theme.colors.border};
  transition: background 0.3s;
  ${media.tablet} { min-width: 20px; max-width: 56px; margin-top: 17px; }
  ${media.mobile} { min-width: 16px; max-width: 40px; margin-top: 14px; height: 2px; }
`;

const StepLabel = styled.div<{ $state: 'done' | 'active' | 'pending' }>`
  font-size: 0.8125rem;
  font-weight: 600;
  text-align: center;
  color: ${({ $state, theme }) =>
    $state === 'active' ? theme.colors.accent :
    $state === 'done' ? theme.strong.olive :
    theme.colors.textTertiary};
  transition: color 0.3s;
  ${media.mobile} { font-size: 0.5625rem; }
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
  color: ${({ theme }) => theme.colors.accent};
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
  background: ${({ theme }) => theme.colors.accent};
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
  border-top-color: ${({ theme }) => theme.colors.accent};
  animation: ${skeletonSpin} 0.9s linear infinite;
`;

const PipelineResultsWrap = styled.div`
  width: calc(100% - 48px);
  max-width: 760px;
  ${media.mobile} { width: calc(100% - 20px); }
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
  ${media.mobile} { max-height: 150px; font-size: 0.625rem; padding: 6px 8px; }
`;

const PipelineLogLine = styled.div<{ $level?: string }>`
  padding: 2px 0;
  line-height: 1.6;
  color: ${({ $level, theme }) =>
    $level === 'error' ? theme.strong.mauve
    : $level === 'warn' ? theme.strong.gold
    : theme.colors.textSecondary};
`;

const PipelineLogTime = styled.span`
  color: ${({ theme }) => theme.colors.accent};
  margin-right: 6px;
`;

const PipelineLogStage = styled.span`
  color: ${({ theme }) => theme.colors.accent};
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
  pool_match: 'search.stagePoolMatch',
  notify: 'search.stageNotify',
  orchestrator: 'search.stageOrchestrator',
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

/* TYPE_COLORS — populated at runtime via useTheme() in the component */
let TYPE_COLORS: Record<string, string> = {};

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
/* MOCK_RELATED_KEYS — colors populated at runtime via useTheme() */
let MOCK_RELATED_KEYS: Array<{ titleKey: string; type: string; color: string }> = [];

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

/* MOCK_SEARCH_RESULTS — colors are token keys, resolved at runtime */
const MOCK_SEARCH_RESULTS_TEMPLATE: Array<Omit<MockLead, 'color'> & { colorKey: 'blue' | 'amber' | 'red' | 'textTertiary' }> = [
  { name: '宏達水電行', phone: '02-2720-1234', address: '台北市信義區松仁路100號', rating: 4.5, reviews: 128, source: 'Google Maps', status: 'new', colorKey: 'blue', hasEmail: true, hasPhone: true, hasWebsite: true, email: 'info@hongda.com.tw', website: 'hongda.com.tw' },
  { name: '永豐水電工程', phone: '02-2705-5678', address: '台北市大安區復興南路200號', rating: 4.2, reviews: 85, source: 'Google Maps', status: 'new', colorKey: 'blue', hasEmail: false, hasPhone: true, hasWebsite: false },
  { name: '大同水電維修', phone: '02-2562-9012', address: '台北市中山區南京東路50號', rating: 4.8, reviews: 203, source: 'Google Maps', status: 'contacted', colorKey: 'amber', hasEmail: true, hasPhone: true, hasWebsite: true, email: 'service@datong-water.tw', website: 'datong-water.tw' },
  { name: '建成水電服務', phone: '02-2302-3456', address: '台北市萬華區西園路88號', rating: 3.9, reviews: 42, source: 'LinkedIn', status: 'new', colorKey: 'blue', hasEmail: true, hasPhone: true, hasWebsite: false, email: 'jiancheng.plumb@gmail.com' },
  { name: '信義水電急修', phone: '02-2579-7890', address: '台北市松山區八德路300號', rating: 4.6, reviews: 156, source: 'Google Maps', status: 'qualified', colorKey: 'blue', hasEmail: true, hasPhone: true, hasWebsite: true, email: 'contact@xinyi-fix.com', website: 'xinyi-fix.com' },
  { name: '台北水電到府', phone: '02-2771-2345', address: '台北市大安區忠孝東路四段120號', rating: 4.1, reviews: 67, source: 'LinkedIn', status: 'new', colorKey: 'red', hasEmail: false, hasPhone: true, hasWebsite: true, website: 'taipei-plumber.tw' },
  { name: '全能水電工程行', phone: '02-2391-6789', address: '台北市中正區重慶南路一段80號', rating: 4.4, reviews: 112, source: 'Google Maps', status: 'new', colorKey: 'blue', hasEmail: true, hasPhone: true, hasWebsite: false, email: 'allpower@gmail.com' },
  { name: '北投水電材料行', phone: '02-2893-0123', address: '台北市北投區中央南路一段45號', rating: 3.7, reviews: 31, source: '104人力銀行', status: 'rejected', colorKey: 'textTertiary', hasEmail: false, hasPhone: true, hasWebsite: false },
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
  const theme = useTheme();

  /* Populate runtime color maps from theme */
  TYPE_COLORS = {
    business: theme.colors.accent,
    person: theme.colors.accent,
    place: theme.strong.gold,
    default: theme.colors.accent,
  };
  MOCK_RELATED_KEYS = [
    { titleKey: 'search.relatedNearby', type: 'location', color: theme.colors.accent },
    { titleKey: 'search.relatedBusiness', type: 'business', color: theme.colors.accent },
    { titleKey: 'search.relatedIndustry', type: 'industry', color: theme.strong.gold },
  ];
  const MOCK_SEARCH_RESULTS: MockLead[] = MOCK_SEARCH_RESULTS_TEMPLATE.map(({ colorKey, ...rest }) => ({
    ...rest,
    color: (theme.colors as any)[colorKey] || theme.colors.accent,
  }));
  const [greetingKey] = useState(() => GREETING_KEYS[Math.floor(Math.random() * GREETING_KEYS.length)]);
  // ponytail: restore form state from localStorage so refresh doesn't wipe it.
  // Falls back to defaults if key missing or JSON corrupt.
  const readSavedForm = (): { kw: string; loc: string; dist: string; tc: number } => {
    try {
      const raw = localStorage.getItem('search-form');
      if (raw) {
        const j = JSON.parse(raw);
        if (typeof j.kw === 'string') {
          return j;
        }
      }
    } catch { /* ignore corrupt localStorage */ }
    return { kw: '', loc: t('search.defaultLocation'), dist: 'all', tc: 20 };
  };
  const saved = readSavedForm();
  const [keyword, setKeyword] = useState(saved.kw);
  const [location, setLocation] = useState(saved.loc);
  const [targetCount, setTargetCount] = useState<number | string>(saved.tc);
  const [searchMode, setSearchMode] = useState('normal');
  const [showModePicker, setShowModePicker] = useState(false);
  const activeMode = MODE_CONFIGS.find(m => m.key === searchMode) || MODE_CONFIGS[0];
  const locRef = useRef<HTMLFormElement>(null);

  /* ── Detail panel state ── */
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailClosing, setDetailClosing] = useState(false);
  const detailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpenDetail = useCallback((leadId: string) => {
    leadsApi.get(leadId).then(r => {
      const lead: Lead = (r.data as any)?.data ?? r.data;
      setSelectedLead(lead);
    }).catch(err => console.error('[Search] Failed to fetch lead detail:', err));
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailClosing(true);
    detailTimerRef.current = setTimeout(() => { setSelectedLead(null); setDetailClosing(false); }, 200);
  }, []);

  /* Close dropdowns on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (locRef.current && !locRef.current.contains(e.target as Node)) {
        setShowLocPicker(false);
        setShowModePicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Pipeline SSE state ── */
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [pipelineLogs, setPipelineLogs] = useState<Array<{time: string, stage: string, message: string, level: string, msgKey?: string, msgParams?: Record<string, any>}>>([]);
  const [latestLogStage, setLatestLogStage] = useState<string>('');
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
    source: lead.source || 'ClientRadar AI',
    status: lead.status || 'new',
    color: theme.colors.accent,
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
      const data = event.data as { runId?: string; level?: string; stage?: string; message?: string; msgKey?: string; msgParams?: Record<string, any> };
      if (data.runId !== campaignId) return;

      setPipelineLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
        stage: data.stage || '',
        message: data.message || '',
        level: data.level || 'info',
        msgKey: data.msgKey,
        msgParams: data.msgParams,
      }]);
      if (data.stage) setLatestLogStage(data.stage);

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
    const payload: SearchPayload = {
      keyword: keyword.trim(),
      location: location.trim(),
      targetCount: Number(targetCount) || 1,
      mode: activeMode.apiMode,
    };
    // ponytail: persist form so a refresh during the pipeline restores inputs.
    try {
      localStorage.setItem('search-form', JSON.stringify({
        kw: payload.keyword,
        loc: location,
        tc: Number(targetCount) || 1,
      }));
    } catch { /* ignore quota / disabled storage */ }
    // Reset pipeline state for new search
    setCampaignId(null);
    setPipelineLogs([]);
    setPipelineProgress(null);
    setPipelineComplete(false);
    setRealResults([]);
    setLatestLogStage('');

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
      {/* Orbital hero — idle state only */}
      {!(search.isPending || isPipelineRunning || pipelineComplete || search.isError) && (
        <OrbitalHero>
          {/* Ring 0 — innermost: S1 Fox + S3 Chicken */}
          <OrbitPath $frac={ORBIT_RINGS[0].frac} $dur={ORBIT_RINGS[0].dur}>
            <OrbitNodeWrap style={orbitNodePos(0)} $dur={ORBIT_RINGS[0].dur}>
              <OrbitAvatar>
                <SpriteAvatar src={AGENTS.S1.sprite} frames={AGENTS.S1.frames} frameW={AGENTS.S1.frameW} frameH={AGENTS.S1.frameH} size={36} />
              </OrbitAvatar>
            </OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(180)} $dur={ORBIT_RINGS[0].dur}>
              <OrbitAvatar>
                <SpriteAvatar src={AGENTS.S3.sprite} frames={AGENTS.S3.frames} frameW={AGENTS.S3.frameW} frameH={AGENTS.S3.frameH} size={36} />
              </OrbitAvatar>
            </OrbitNodeWrap>
          </OrbitPath>
          {/* Ring 1 — S2 Cow + S4 Duck + Farmer */}
          <OrbitPath $frac={ORBIT_RINGS[1].frac} $dur={ORBIT_RINGS[1].dur} $reverse>
            <OrbitNodeWrap style={orbitNodePos(30)} $dur={ORBIT_RINGS[1].dur} $reverse>
              <OrbitAvatar>
                <SpriteAvatar src={AGENTS.S2.sprite} frames={AGENTS.S2.frames} frameW={AGENTS.S2.frameW} frameH={AGENTS.S2.frameH} size={36} />
              </OrbitAvatar>
            </OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(150)} $dur={ORBIT_RINGS[1].dur} $reverse>
              <OrbitAvatar>
                <SpriteAvatar src={AGENTS.S4.sprite} frames={AGENTS.S4.frames} frameW={AGENTS.S4.frameW} frameH={AGENTS.S4.frameH} size={36} />
              </OrbitAvatar>
            </OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(270)} $dur={ORBIT_RINGS[1].dur} $reverse>
              <OrbitAvatar>
                <SpriteAvatar src={FARMER.sprite} frames={FARMER.frames} frameW={FARMER.frameW} frameH={FARMER.frameH} size={36} />
              </OrbitAvatar>
            </OrbitNodeWrap>
          </OrbitPath>
          {/* Ring 2 — planet dots */}
          <OrbitPath $frac={ORBIT_RINGS[2].frac} $dur={ORBIT_RINGS[2].dur}>
            <OrbitNodeWrap style={orbitNodePos(0)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.colors.accent} $s={10} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(72)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.colors.accent} $s={7} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(144)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.strong.olive} $s={9} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(216)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.strong.mauve} $s={6} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(288)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.strong.gold} $s={8} /></OrbitNodeWrap>
          </OrbitPath>
          {/* Ring 3 — outer dots */}
          <OrbitPath $frac={ORBIT_RINGS[3].frac} $dur={ORBIT_RINGS[3].dur} $reverse>
            <OrbitNodeWrap style={orbitNodePos(20)} $dur={ORBIT_RINGS[3].dur} $reverse><OrbitDot $color={theme.colors.accent} $s={8} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(110)} $dur={ORBIT_RINGS[3].dur} $reverse><OrbitDot $color={theme.colors.accent} $s={6} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(200)} $dur={ORBIT_RINGS[3].dur} $reverse><OrbitDot $color={theme.strong.olive} $s={7} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(290)} $dur={ORBIT_RINGS[3].dur} $reverse><OrbitDot $color={theme.strong.gold} $s={5} /></OrbitNodeWrap>
          </OrbitPath>
          {/* Ring 4 — far dots */}
          <OrbitPath $frac={ORBIT_RINGS[4].frac} $dur={ORBIT_RINGS[4].dur}>
            <OrbitNodeWrap style={orbitNodePos(15)} $dur={ORBIT_RINGS[4].dur}><OrbitDot $color={theme.colors.accent} $s={5} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(87)} $dur={ORBIT_RINGS[4].dur}><OrbitDot $color={theme.strong.mauve} $s={4} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(159)} $dur={ORBIT_RINGS[4].dur}><OrbitDot $color={theme.colors.accent} $s={6} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(231)} $dur={ORBIT_RINGS[4].dur}><OrbitDot $color={theme.strong.olive} $s={4} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(303)} $dur={ORBIT_RINGS[4].dur}><OrbitDot $color={theme.strong.gold} $s={5} /></OrbitNodeWrap>
          </OrbitPath>
          {/* Ring 5 — outermost subtle dots */}
          <OrbitPath $frac={ORBIT_RINGS[5].frac} $dur={ORBIT_RINGS[5].dur} $reverse>
            <OrbitNodeWrap style={orbitNodePos(0)} $dur={ORBIT_RINGS[5].dur} $reverse><OrbitDot $color={theme.colors.accent} $s={3} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(60)} $dur={ORBIT_RINGS[5].dur} $reverse><OrbitDot $color={theme.colors.accent} $s={4} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(120)} $dur={ORBIT_RINGS[5].dur} $reverse><OrbitDot $color={theme.strong.olive} $s={3} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(180)} $dur={ORBIT_RINGS[5].dur} $reverse><OrbitDot $color={theme.strong.gold} $s={4} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(240)} $dur={ORBIT_RINGS[5].dur} $reverse><OrbitDot $color={theme.strong.mauve} $s={3} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(300)} $dur={ORBIT_RINGS[5].dur} $reverse><OrbitDot $color={theme.colors.accent} $s={4} /></OrbitNodeWrap>
          </OrbitPath>
        </OrbitalHero>
      )}

      {/* Greeting — in flow, z-index above orbits */}
      {!(search.isPending || isPipelineRunning || pipelineComplete || search.isError) && (
        <GradientGreeting>{t(greetingKey)}</GradientGreeting>
      )}

      <GlowWrap>
        {DOT_CONFIG.map((d, i) => (
          <Dot key={i} $x={d.x} $y={d.y} $size={d.size} $delay={d.delay} $dur={d.dur} />
        ))}
        <UnifiedBar as="form" onSubmit={handleSubmit} ref={locRef} $morphing={search.isPending || isPipelineRunning} $glow={false}>
            <BarInput
              type="text"
              placeholder={t('search.keywordPlaceholder')}
              value={keyword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)}
              required
              autoFocus
            />
            <BarToolRow>
              <ModePickerWrap>
                <ModePickerTrigger type="button" $color={activeMode.color} onClick={() => setShowModePicker(p => !p)}>
                  {activeMode.key === 'normal' ? <GoogleText suffix=" Maps" icon={<MapIcon color="#34A853" />} />
                    : activeMode.key === 'google_search' ? <GoogleText suffix=" Search" icon={<SearchIcon color="#4285F4" />} />
                    : activeMode.key === 'linkedin' ? <LinkedInText />
                    : <>{activeMode.labelKey ? t(activeMode.labelKey) : activeMode.label}<WebsiteIcon color={activeMode.color} /></>}
                </ModePickerTrigger>
                {showModePicker && (
                  <ModePickerDropdown>
                    {MODE_CONFIGS.map(m => (
                      <ModePickerItem
                        key={m.key}
                        type="button"
                        $active={searchMode === m.key}
                        $color={m.color}
                        onClick={() => { setSearchMode(m.key); setShowModePicker(false); }}
                      >
                        <ModeItemCheck $active={searchMode === m.key} $color={m.color}>
                          {searchMode === m.key && '✓'}
                        </ModeItemCheck>
                        <ModeItemText>
                          <ModeItemLabel $color={m.color}>
                            {m.key === 'normal' ? <GoogleText suffix=" Maps" icon={<MapIcon color="#34A853" />} />
                              : m.key === 'google_search' ? <GoogleText suffix=" Search" icon={<SearchIcon color="#4285F4" />} />
                              : m.key === 'linkedin' ? <LinkedInText />
                              : <>{m.labelKey ? t(m.labelKey) : m.label}<WebsiteIcon color={m.color} /></>}
                          </ModeItemLabel>
                          <ModeItemDesc>{t(m.descKey)}</ModeItemDesc>
                        </ModeItemText>
                      </ModePickerItem>
                    ))}
                  </ModePickerDropdown>
                )}
              </ModePickerWrap>
              <LocInputWrap>
                <MapPinIcon />
                <LocInput
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder={t('search.customLocationPlaceholder')}
                />
              </LocInputWrap>
              <NumberWrap>
                <NumArrowBtn type="button" onClick={() => setTargetCount(c => Math.min(200, (Number(c) || 1) + 5))}><ChevronUp /></NumArrowBtn>
                <NumberInput
                  type="number"
                  min={1}
                  max={200}
                  value={targetCount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const v = e.target.value;
                    if (v === '') { setTargetCount(''); return; }
                    const n = Number(v);
                    if (!isNaN(n)) setTargetCount(Math.min(200, n));
                  }}
                  onBlur={() => {
                    const n = Number(targetCount);
                    setTargetCount((!n || n < 1) ? 1 : Math.min(200, n));
                  }}
                />
                <NumArrowBtn type="button" onClick={() => setTargetCount(c => Math.max(1, (Number(c) || 1) - 5))}><ChevronDown /></NumArrowBtn>
              </NumberWrap>
              <BarSearchBtn type="submit" disabled={search.isPending || !keyword.trim()}>
                {search.isPending ? <Spinner /> : <SearchBtnIcon />}
              </BarSearchBtn>
            </BarToolRow>
            {/* Progress ring overlay */}
            {(search.isPending || isPipelineRunning) && (
              <SearchRingWrap>
                <SearchRing $percent={pipelineProgress?.percent}>
                  <svg className="ring-svg" width="140" height="140" viewBox="0 0 140 140">
                    <circle cx="70" cy="70" r="62" fill="none" stroke="rgba(37,99,235,0.10)" strokeWidth="4" />
                    <circle
                      cx="70" cy="70" r="62"
                      fill="none"
                      stroke={theme.colors.accent}
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
        <PipelineResultsWrap>
          {/* Status banner — loading state handled by ring */}
          {search.isError && (
            <StatusBanner $type="error">{t('search.searchFailedWithMessage', { message: (search.error as any)?.message || t('search.unknownError') })}</StatusBanner>
          )}
          {isPipelineRunning && (
            <PipelineSection>
              {/* Stepper */}
              <StepperWrap>
                {PIPELINE_STAGES.map((stage, i) => {
                  const activeStage = latestLogStage || pipelineProgress?.stage || '';
                  const currentIdx = PIPELINE_STAGES.indexOf(activeStage as typeof PIPELINE_STAGES[number]);
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
                      {log.msgKey ? t(log.msgKey, log.msgParams) : log.message}
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
                  <ResultCard key={i} onClick={() => lead._id && handleOpenDetail(lead._id)}>
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
                        <ContactIcon $has={lead.hasEmail} $color={theme.colors.accent}>
                          <SvgIcon d="M1 3.5h14v9H1z M1 3.5l7 5 7-5" size={12} /> {lead.hasEmail ? lead.email : ''}
                        </ContactIcon>
                        <ContactIcon $has={lead.hasPhone} $color={theme.strong.olive}>
                          <SvgIcon d="M3 1.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" size={12} /> {lead.hasPhone ? lead.phone : ''}
                        </ContactIcon>
                        <ContactIcon $has={lead.hasWebsite} $color={theme.strong.gold}>
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
        </PipelineResultsWrap>
      )}

      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          closing={detailClosing}
          onClose={handleCloseDetail}
          rightPanel={
            selectedLead.company_name ? (
              <LeadEmails companyName={selectedLead.company_name} leadId={selectedLead._id} />
            ) : undefined
          }
        />
      )}
    </Page>
  );
};

export default SearchPage;
