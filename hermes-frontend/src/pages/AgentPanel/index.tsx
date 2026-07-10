import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import styled, { keyframes, css, useTheme } from 'styled-components';
// Components used in floating panel only
import { useAgentStats, useNotifications, useSettings, useTasks } from '../../api/hooks';
import type { AgentSkillStats } from '../../api/services';
import type { NotificationItem } from '../../api/notifications';
import { media } from '../../styles/media';
import IsometricWorld from './IsometricWorld';

/* ── Skill → i18n key mapping ── */
const SKILL_I18N: Record<string, { nameKey: string; typeKey: string }> = {
  S1: { nameKey: 'agents.s1Name', typeKey: 'agents.s1Type' },
  S2: { nameKey: 'agents.s2Name', typeKey: 'agents.s2Type' },
  S3: { nameKey: 'agents.s3Name', typeKey: 'agents.s3Type' },
  S4: { nameKey: 'agents.s4Name', typeKey: 'agents.s4Type' },
};

const NOTIF_EVENT_MAP: Record<string, string> = {
  lead: 'scrape',
  email: 'email',
  task: 'qualify',
  campaign: 'qualify',
  system: 'qualify',
};

/** 安全解析時間字串（worker 用 toISOString() 儲存 UTC，去咗 Z，要加返） */
function safeParseDate(s: string): Date {
  const normalized = s.includes('T') ? s : s.replace(' ', 'T');
  // 冇時區標記 → 當 UTC（因為 worker 用 toISOString 產生）
  return new Date(normalized.endsWith('Z') ? normalized : normalized + 'Z');
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - safeParseDate(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTime(iso: string): string {
  const d = safeParseDate(iso);
  if (isNaN(d.getTime())) return '--:--';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (isToday) return `${hh}:${mm}`;
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${MM}/${dd} ${hh}:${mm}`;
}

/* ══════════════════════════════════════
   Agent Panel — Full-screen pixel world
   with overlaid game-style UI
   ══════════════════════════════════════ */

/* ── Agent color map (farm palette) ── */
const AGENT_COLORS: Record<string, { accent: string; bg1: string; bg2: string; fg: string; fgDark: string }> = {
  S1: { accent: '#f97316', bg1: '#fff7ed', bg2: '#ffedd5', fg: '#9a3412', fgDark: '#fb923c' },  /* Fox — warm orange */
  S2: { accent: '#64748b', bg1: '#f8fafc', bg2: '#f1f5f9', fg: '#1e293b', fgDark: '#94a3b8' },  /* Cow — slate */
  S3: { accent: '#ef4444', bg1: '#fef2f2', bg2: '#fee2e2', fg: '#991b1b', fgDark: '#f87171' },  /* Chicken — red comb */
  S4: { accent: '#22c55e', bg1: '#f0fdf4', bg2: '#dcfce7', fg: '#14532d', fgDark: '#4ade80' },  /* Duck — green head */
};

const FEED_COLORS: Record<string, { accent: string; icon: string }> = {
  scrape: { accent: '#16a34a', icon: '🌱' },
  email:  { accent: '#0ea5e9', icon: '✉️' },
  qualify: { accent: '#d97706', icon: '⚡' },
};

const SOURCE_LABELS: Record<string, string> = {
  lead: 'Lead',
  email: 'Email',
  task: 'Task',
  campaign: 'Campaign',
  system: 'System',
};

/* ── Agent label positions (zoned layout) ── */
const AGENT_POSITIONS: Record<string, { top: string; left: string }> = {
  S1: { top: '30%', left: '2%' },   /* Fox — top-left corner */
  S2: { top: '46%', left: '5%' },   /* Cow — left pasture */
  S3: { top: '36%', left: '72%' },  /* Chicken — right field */
  S4: { top: '58%', left: '35%' },  /* Duck — river */
};

/* ── Agent sprite images (farm animals) ── */
const AGENT_SPRITES: Record<string, { idle: string; frames: number }> = {
  S1: { idle: '/assets/pixel-world/sprites/fox-idle.png', frames: 6 },
  S2: { idle: '/assets/pixel-world/sprites/cow-idle.png', frames: 5 },
  S3: { idle: '/assets/pixel-world/sprites/chicken-idle.png', frames: 5 },
  S4: { idle: '/assets/pixel-world/sprites/duck-idle.png', frames: 4 },
};

/* ── Scene container: full-screen with relative positioning ── */
const SceneContainer = styled.div`
  position: relative;
  width: 100%;
  min-height: 500px;
  height: calc(100vh - 80px);
  overflow: hidden;
  border-radius: 12px;
`;

/* ── IsometricWorld fills entire background ── */
const WorldBackground = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
`;

/* ── Title bar overlay — top-left ── */
const TitleBar = styled.div`
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  user-select: none;
`;

const TitleText = styled.span`
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 3px;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  text-transform: uppercase;
`;

const livePulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`;

const LiveBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  background: rgba(34, 197, 94, 0.25);
  border: 1px solid rgba(34, 197, 94, 0.5);
  border-radius: 4px;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #4ade80;
  animation: ${livePulse} 2s ease-in-out infinite;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 6px #22c55e;
  }
`;

/* ── Agent floating labels — game-style name tags with sprite ── */
const labelAppear = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const idleBounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3px); }
`;

/* ── Natural animal movement animations ── */
const foxDart = keyframes`
  0%, 100% { transform: translate(0, 0) scaleX(1); }
  15% { transform: translate(18px, -6px) scaleX(1); }
  30% { transform: translate(30px, 0) scaleX(1); }
  45% { transform: translate(20px, 4px) scaleX(-1); }
  60% { transform: translate(5px, -2px) scaleX(-1); }
  80% { transform: translate(-8px, 3px) scaleX(1); }
`;

const cowGraze = keyframes`
  0%, 100% { transform: translateY(0); }
  20% { transform: translateY(3px); }
  40% { transform: translateY(5px); }
  60% { transform: translateY(3px); }
  80% { transform: translateY(1px); }
`;

const chickenPeck = keyframes`
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  10% { transform: translate(2px, 3px) rotate(5deg); }
  20% { transform: translate(0, 0) rotate(0deg); }
  40% { transform: translate(-3px, 4px) rotate(-4deg); }
  50% { transform: translate(0, 0) rotate(0deg); }
  70% { transform: translate(4px, 3px) rotate(3deg); }
  80% { transform: translate(0, 0) rotate(0deg); }
`;

const duckSwim = keyframes`
  0%   { transform: translate(0, 0) scaleX(1); }
  20%  { transform: translate(30px, 2px) scaleX(1); }
  40%  { transform: translate(55px, -1px) scaleX(1); }
  50%  { transform: translate(60px, 0) scaleX(-1); }
  70%  { transform: translate(35px, 2px) scaleX(-1); }
  90%  { transform: translate(5px, -1px) scaleX(-1); }
  100% { transform: translate(0, 0) scaleX(1); }
`;

const AGENT_ANIMATIONS: Record<string, ReturnType<typeof keyframes>> = {
  S1: foxDart,
  S2: cowGraze,
  S3: chickenPeck,
  S4: duckSwim,
};

const AGENT_ANIM_DURATION: Record<string, number> = {
  S1: 6,
  S2: 5,
  S3: 3,
  S4: 12,
};

/* ── Decorative extra animals (no labels, natural groups) ── */
const DECO_ANIMALS: Array<{
  sprite: string; frames: number; top: string; left: string;
  anim: ReturnType<typeof keyframes>; dur: number; scale: number; delay: number; flip?: boolean;
}> = [
  /* Extra cows — spread across left pasture */
  { sprite: '/assets/pixel-world/sprites/cow-idle.png', frames: 5, top: '40%', left: '18%', anim: cowGraze, dur: 6, scale: 3, delay: 1 },
  { sprite: '/assets/pixel-world/sprites/cow-idle.png', frames: 5, top: '50%', left: '28%', anim: cowGraze, dur: 7, scale: 3.5, delay: 2, flip: true },
  { sprite: '/assets/pixel-world/sprites/cow-idle.png', frames: 5, top: '44%', left: '38%', anim: cowGraze, dur: 5.5, scale: 3, delay: 0.5 },
  /* Extra chickens — spread across right field */
  { sprite: '/assets/pixel-world/sprites/chicken-idle.png', frames: 5, top: '34%', left: '80%', anim: chickenPeck, dur: 2.5, scale: 2.5, delay: 0.3 },
  { sprite: '/assets/pixel-world/sprites/chicken-idle.png', frames: 5, top: '42%', left: '65%', anim: chickenPeck, dur: 3.5, scale: 2.5, delay: 1.5, flip: true },
  { sprite: '/assets/pixel-world/sprites/chicken-idle.png', frames: 5, top: '38%', left: '88%', anim: chickenPeck, dur: 2.8, scale: 2, delay: 0.8 },
  /* Extra foxes — corners */
  { sprite: '/assets/pixel-world/sprites/fox-idle.png', frames: 6, top: '76%', left: '85%', anim: foxDart, dur: 7, scale: 2.5, delay: 2, flip: true },
  { sprite: '/assets/pixel-world/sprites/fox-idle.png', frames: 6, top: '74%', left: '2%', anim: foxDart, dur: 8, scale: 2.5, delay: 3 },
  /* Extra ducks — river area */
  { sprite: '/assets/pixel-world/sprites/duck-idle.png', frames: 4, top: '60%', left: '22%', anim: duckSwim, dur: 14, scale: 2.5, delay: 1 },
  { sprite: '/assets/pixel-world/sprites/duck-idle.png', frames: 4, top: '62%', left: '52%', anim: duckSwim, dur: 11, scale: 2.5, delay: 3, flip: true },
  { sprite: '/assets/pixel-world/sprites/duck-idle.png', frames: 4, top: '58%', left: '60%', anim: duckSwim, dur: 13, scale: 2, delay: 5 },
];

const AgentLabelWrap = styled.div<{ $top: string; $left: string }>`
  position: absolute;
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  animation: ${labelAppear} 0.4s ease backwards;
  user-select: none;

  &:hover > div:last-child {
    transform: translateY(-2px);
    background: rgba(0, 0, 0, 0.82);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }
`;

/* Wrapper that carries the per-agent movement animation */
const SpriteMotion = styled.div<{ $anim: ReturnType<typeof keyframes>; $dur: number }>`
  animation: ${({ $anim }) => $anim} ${({ $dur }) => $dur}s ease-in-out infinite;
  position: relative;
`;

const SpriteCanvas = styled.div<{ $src: string; $frames: number; $frameSize: number }>`
  width: ${({ $frameSize }) => $frameSize}px;
  height: ${({ $frameSize }) => $frameSize}px;
  background-image: url(${({ $src }) => $src});
  background-size: ${({ $frames, $frameSize }) => $frames * $frameSize}px ${({ $frameSize }) => $frameSize}px;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
  animation: ${idleBounce} 2s ease-in-out infinite;
  filter: drop-shadow(0 3px 6px rgba(0,0,0,0.25));
`;

/* ── Decorative animal wrapper (no label, just sprite) ── */
const DecoAnimalWrap = styled.div<{ $top: string; $left: string; $flip?: boolean }>`
  position: absolute;
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  z-index: 3;
  pointer-events: none;
  ${({ $flip }) => $flip && 'transform: scaleX(-1);'}
`;

const AgentLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  border-radius: 6px;
  transition: transform 0.18s, background 0.18s, box-shadow 0.18s;
  white-space: nowrap;

  ${media.mobile} {
    padding: 4px 8px;
    gap: 4px;
  }
`;

const LabelStatusDot = styled.span<{ $isRunning: boolean; $accent: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $isRunning, $accent }) => $isRunning ? $accent : '#6b7280'};
  ${({ $isRunning, $accent }) => $isRunning && css`
    box-shadow: 0 0 6px ${$accent}, 0 0 2px ${$accent};
  `}
`;

const LabelName = styled.span`
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
`;

const LabelType = styled.span<{ $color: string }>`
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: 10px;
  color: ${({ $color }) => $color};
  opacity: 0.9;
  line-height: 1;
`;

/* ── Activity feed overlay — right edge ── */
const ActivityPanel = styled.div<{ $open: boolean }>`
  position: absolute;
  top: 15%;
  right: 0;
  z-index: 10;
  width: 280px;
  height: 70%;
  display: flex;
  flex-direction: column;
  background: rgba(15, 15, 25, 0.75);
  backdrop-filter: blur(8px);
  border-radius: 8px 0 0 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-right: none;
  transform: translateX(${({ $open }) => $open ? '0' : 'calc(100% - 36px)'});
  transition: transform 0.3s ease;
  overflow: hidden;

  ${media.mobile} {
    width: 240px;
  }
`;

const ActivityHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 8px;
  flex-shrink: 0;
`;

const ActivityTitle = styled.span`
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #f59e0b;
  text-shadow: 0 0 8px rgba(245, 158, 11, 0.3);
  text-transform: uppercase;
`;

const ActivityToggle = styled.button<{ $open: boolean }>`
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.5);
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
  transform: rotate(${({ $open }) => $open ? '0' : '180deg'});
  transition: transform 0.3s, color 0.15s;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const ActivityScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 14px 14px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 2px;
  }
`;

const ActivityEntry = styled.div`
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  line-height: 1.5;

  &:last-child {
    border-bottom: none;
  }
`;

const EntryTime = styled.span`
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-right: 8px;
`;

const EntryAgent = styled.span<{ $color: string }>`
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-weight: 700;
  color: ${({ $color }) => $color};
  margin-right: 6px;
  font-size: 12px;
`;

const EntryMessage = styled.span`
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
`;

const ActivityEmpty = styled.div`
  padding: 20px 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
`;

/* ── Stats bar overlay — bottom-center ── */
const StatsBar = styled.div`
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px 20px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  user-select: none;
`;

const StatChip = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.75);
  white-space: nowrap;
`;

const StatNumber = styled.span<{ $color?: string }>`
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-weight: 700;
  font-size: 15px;
  color: ${({ $color }) => $color || '#fff'};
`;

/* ── Gear overlay button — bottom-right ── */
const GearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="8" cy="8" r="2.5"/>
    <path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.85.85M11.75 11.75l.85.85M3.4 12.6l.85-.85M11.75 4.25l.85-.85"/>
  </svg>
);

const GearOverlayBtn = styled.button`
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  width: 38px;
  height: 38px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s;

  &:hover {
    color: #fff;
    background: rgba(0, 0, 0, 0.8);
    border-color: rgba(255, 255, 255, 0.25);
  }
`;

/* ── Config overlay — appears above gear button ── */
const ConfigOverlay = styled.div`
  position: absolute;
  bottom: 64px;
  right: 16px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 200px;
`;

const ConfigOverlayItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  &:last-child { border-bottom: none; }
`;

const ConfigOverlayLabel = styled.span`
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
  white-space: nowrap;
`;

const ConfigOverlayValue = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
`;

/* ── Floating Timeline Panel (kept intact) ── */

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 1200;
  animation: ${fadeIn} 0.15s ease;
`;

const FloatingPanel = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1201;
  width: min(720px, 90vw);
  max-height: 80vh;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  animation: ${fadeIn} 0.2s ease;

  ${media.mobile} {
    width: calc(100vw - 32px);
    max-height: 90vh;
  }
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const PanelHeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const PanelHeaderTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const PanelHeaderSub = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
`;

const CloseBtn = styled.button`
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
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.08)'};
  }
`;

const TimelineBody = styled.div`
  padding: 20px;
  overflow-x: auto;
  overflow-y: auto;
  flex: 1;
`;

/* ── Horizontal Stepper Pipeline ── */

const StepperWrap = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: 12px 0;
  min-width: max-content;
`;

const StepNode = styled.div<{ $status: 'done' | 'active' | 'pending' }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 90px;
  max-width: 120px;
  position: relative;
  ${({ $status }) => $status === 'pending' && css`opacity: 0.45;`}
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(14,165,233,0.3); }
  50%      { box-shadow: 0 0 0 8px rgba(14,165,233,0); }
`;

const StepCircle = styled.div<{ $status: 'done' | 'active' | 'pending'; $color?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
  background: ${({ $status, $color, theme }) =>
    $status === 'done' ? ($color || theme.colors.green) :
    $status === 'active' ? ($color || theme.colors.blue) :
    theme.colors.surfaceMuted};
  color: ${({ $status }) => $status === 'pending' ? '#88a890' : '#fff'};
  box-shadow: ${({ $status }) => $status !== 'pending' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'};
  ${({ $status }) => $status === 'active' && css`animation: ${pulseGlow} 2s ease-in-out infinite;`}

  svg { width: 16px; height: 16px; }
`;

const StepConnector = styled.div<{ $done?: boolean; $color?: string }>`
  flex: 1;
  height: 3px;
  min-width: 28px;
  margin-top: 17px;
  border-radius: 2px;
  background: ${({ $done, $color, theme }) =>
    $done
      ? `linear-gradient(90deg, ${$color || theme.colors.green}, ${$color || theme.colors.blue})`
      : theme.colors.border};
  transition: background 0.3s;
`;

const StepLabel = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
  text-align: center;
  line-height: 1.3;
  word-break: break-word;
`;

const StepDate = styled.div`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-family: 'JetBrains Mono', monospace;
`;

/* step icons */
const StepIconCheck = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 8.5l3.5 3.5L13 5"/></svg>
);
const StepIconPlay = () => (
  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M5 3l8 5-8 5V3z"/></svg>
);
const StepIconCircle = () => (
  <svg viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="3"/></svg>
);
const StepIconFail = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
);

const PanelFooter = styled.div`
  padding: 12px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const FooterStat = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const ProgressMini = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ProgressTrack = styled.div`
  width: 100px;
  height: 4px;
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${({ theme }) => theme.colors.green};
  border-radius: 2px;
  transition: width 0.3s ease;
`;

const ProgressLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.green};
`;


/* ── Sprite frame animator ── */
const SpriteAnimator: React.FC<{
  src: string;
  frameCount: number;
  frameSize: number;
  scale?: number;
  fps?: number;
}> = ({ src, frameCount, frameSize, scale = 2, fps = 4 }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % frameCount);
    }, 1000 / fps);
    return () => clearInterval(id);
  }, [frameCount, fps]);

  const displaySize = frameSize * scale;

  return (
    <SpriteCanvas
      $src={src}
      $frames={frameCount}
      $frameSize={displaySize}
      style={{
        backgroundPosition: `-${frame * displaySize}px 0`,
        backgroundSize: `${frameCount * displaySize}px ${displaySize}px`,
      }}
    />
  );
};

const AgentPanel: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme() as any;
  const { data: statsRaw } = useAgentStats();
  const { data: notifsRaw } = useNotifications({ limit: 10 });
  const { data: settingsRaw } = useSettings();
  const { data: tasksRaw } = useTasks();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [feedOpen, setFeedOpen] = useState(true);

  /* ── Agent data from task stats ── */
  const statsArr: AgentSkillStats[] = Array.isArray(statsRaw) ? statsRaw : [];
  const agentCards = ['S1', 'S2', 'S3', 'S4'].map((skill) => {
    const s = statsArr.find((x) => x._id === skill);
    const completed = s?.completed ?? 0;
    const failed = s?.failed ?? 0;
    const total = completed + failed;
    const rate = total > 0 ? Math.round((completed / total) * 100 * 10) / 10 : 0;
    const running = s?.running ?? 0;
    const status = running > 0 ? 'running' : completed > 0 ? 'idle' : 'idle';
    return {
      skill,
      name: t(SKILL_I18N[skill]?.nameKey ?? '') || skill,
      type: t(SKILL_I18N[skill]?.typeKey ?? ''),
      completed,
      failed,
      rate,
      status,
      lastRun: s?.last_run ? formatTimeAgo(s.last_run) : '—',
    };
  });

  /* ── Aggregate stats for bottom bar ── */
  const totalCompleted = agentCards.reduce((sum, ag) => sum + ag.completed, 0);
  const totalFailed = agentCards.reduce((sum, ag) => sum + ag.failed, 0);
  const totalTasks = totalCompleted + totalFailed;
  const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  /* ── Activity feed from notifications ── */
  const notifications: NotificationItem[] = (notifsRaw as any)?.data ?? [];

  /* ── Config from settings ── */
  const settingsMap: Record<string, any> = {};
  if (Array.isArray(settingsRaw)) {
    for (const s of settingsRaw as any[]) settingsMap[s.key] = s.value;
  } else if (settingsRaw && typeof settingsRaw === 'object') {
    Object.assign(settingsMap, settingsRaw);
  }

  const configData = [
    { setting: t('agents.config.searchDepth'), value: settingsMap['search_depth'] ?? '3' },
    { setting: t('agents.config.emailBatch'), value: settingsMap['email_batch'] ?? '50' },
    { setting: t('agents.config.qualifyThreshold'), value: settingsMap['qualify_threshold'] ?? '0.7' },
    { setting: t('agents.config.scrapeInterval'), value: settingsMap['scrape_interval'] ?? '30min' },
  ];

  /* ── Recent tasks for timeline (filtered by selected skill) ── */
  const allTasks: any[] = (tasksRaw as any)?.items ?? [];
  const selectedTasks = selectedSkill
    ? allTasks.filter((t: any) => t.skill_id === selectedSkill).slice(0, 15)
    : [];

  const handleClose = useCallback(() => setSelectedSkill(null), []);

  /* ── Determine feed entry color by notification type ── */
  const getAgentColor = (type: string): string => {
    const ev = NOTIF_EVENT_MAP[type] || 'qualify';
    return FEED_COLORS[ev]?.accent || '#d97706';
  };

  return (
    <SceneContainer>
      {/* ── Background: IsometricWorld fills entire scene ── */}
      <WorldBackground>
        <IsometricWorld />
      </WorldBackground>

      {/* ── Title bar overlay — top-left ── */}
      <TitleBar>
        <TitleText>HERMES FARM</TitleText>
        <LiveBadge>LIVE</LiveBadge>
      </TitleBar>

      {/* ── Decorative animals (extra animals per zone, no labels) ── */}
      {DECO_ANIMALS.map((d, i) => (
        <DecoAnimalWrap key={`deco-${i}`} $top={d.top} $left={d.left} $flip={d.flip}>
          <SpriteMotion $anim={d.anim} $dur={d.dur} style={{ animationDelay: `${d.delay}s` }}>
            <SpriteAnimator src={d.sprite} frameCount={d.frames} frameSize={48} scale={d.scale} fps={4} />
          </SpriteMotion>
        </DecoAnimalWrap>
      ))}

      {/* ── Main agent animals with labels ── */}
      {agentCards.map((ag) => {
        const c = AGENT_COLORS[ag.skill] ?? AGENT_COLORS.S1;
        const pos = AGENT_POSITIONS[ag.skill];
        const sprite = AGENT_SPRITES[ag.skill];
        const isRunning = ag.status === 'running';
        const motionAnim = AGENT_ANIMATIONS[ag.skill] ?? foxDart;
        const motionDur = AGENT_ANIM_DURATION[ag.skill] ?? 8;
        return (
          <AgentLabelWrap
            key={ag.skill}
            $top={pos.top}
            $left={pos.left}
            style={{ animationDelay: `${['S1','S2','S3','S4'].indexOf(ag.skill) * 0.08}s` }}
            onClick={() => setSelectedSkill(ag.skill)}
          >
            <SpriteMotion $anim={motionAnim} $dur={motionDur}>
              {sprite && (
                <SpriteAnimator
                  src={sprite.idle}
                  frameCount={sprite.frames}
                  frameSize={48}
                  scale={4}
                  fps={5}
                />
              )}
            </SpriteMotion>
            <AgentLabel>
              <LabelStatusDot $isRunning={isRunning} $accent={c.accent} />
              <LabelName>{ag.name}</LabelName>
              <LabelType $color={c.fgDark}>{ag.type}</LabelType>
            </AgentLabel>
          </AgentLabelWrap>
        );
      })}

      {/* ── Activity feed overlay — right edge ── */}
      <ActivityPanel $open={feedOpen}>
        <ActivityHeader>
          <ActivityTitle>{feedOpen ? 'ACTIVITY LOG' : ''}</ActivityTitle>
          <ActivityToggle $open={feedOpen} onClick={() => setFeedOpen((v) => !v)} title={feedOpen ? 'Collapse' : 'Expand'}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4l-4 4 4 4"/></svg>
          </ActivityToggle>
        </ActivityHeader>
        {feedOpen && (
          <ActivityScroll>
            {notifications.length === 0 && (
              <ActivityEmpty>{t('agents.noActivity')}</ActivityEmpty>
            )}
            {notifications.slice(0, 30).map((n) => {
              const srcLabel = SOURCE_LABELS[n.type] || 'System';
              const ev = NOTIF_EVENT_MAP[n.type] || 'qualify';
              const color = FEED_COLORS[ev]?.accent || '#d97706';
              const icon = FEED_COLORS[ev]?.icon || '⚡';
              return (
                <ActivityEntry key={n._id}>
                  <EntryTime>{formatTime(n.created_at)}</EntryTime>
                  <EntryAgent $color={color}>{icon} {srcLabel}</EntryAgent>
                  <EntryMessage>{n.title || n.message}</EntryMessage>
                </ActivityEntry>
              );
            })}
          </ActivityScroll>
        )}
      </ActivityPanel>

      {/* ── Stats bar overlay — bottom-center ── */}
      <StatsBar>
        <StatChip>
          Tasks <StatNumber>{totalTasks}</StatNumber>
        </StatChip>
        <StatChip>
          Done <StatNumber $color="#4ade80">{totalCompleted}</StatNumber>
        </StatChip>
        <StatChip>
          Failed <StatNumber $color="#f87171">{totalFailed}</StatNumber>
        </StatChip>
        <StatChip>
          Rate <StatNumber $color="#fbbf24">{completionRate}%</StatNumber>
        </StatChip>
      </StatsBar>

      {/* ── Config gear overlay — bottom-right ── */}
      {showConfig && (
        <ConfigOverlay>
          {configData.map((item) => (
            <ConfigOverlayItem key={item.setting}>
              <ConfigOverlayLabel>{item.setting}</ConfigOverlayLabel>
              <ConfigOverlayValue>{item.value}</ConfigOverlayValue>
            </ConfigOverlayItem>
          ))}
        </ConfigOverlay>
      )}
      <GearOverlayBtn onClick={() => setShowConfig((v) => !v)} title={t('agents.configTitle')}>
        <GearIcon />
      </GearOverlayBtn>

      {/* ── Floating Timeline: recent tasks for this skill (portal, unchanged) ── */}
      {selectedSkill && createPortal(
        <>
          <Overlay onClick={handleClose} />
          <FloatingPanel>
            <PanelHeader>
              <PanelHeaderLeft>
                <PanelHeaderTitle>{t(SKILL_I18N[selectedSkill]?.nameKey ?? '') || selectedSkill}</PanelHeaderTitle>
                <PanelHeaderSub>{t(SKILL_I18N[selectedSkill]?.typeKey ?? '')} · {selectedSkill}</PanelHeaderSub>
              </PanelHeaderLeft>
              <CloseBtn onClick={handleClose} title="Close"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></CloseBtn>
            </PanelHeader>

            <TimelineBody>
              {selectedTasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', opacity: 0.5, fontSize: 13 }}>
                  暫無任務記錄
                </div>
              )}
              <StepperWrap>
                {selectedTasks.map((task: any, i: number) => {
                  const status = task.status === 'completed' ? 'done' as const
                    : task.status === 'running' ? 'active' as const
                    : task.status === 'failed' ? 'done' as const
                    : 'pending' as const;
                  const dateStr = task._updated_at || task._created_at || '';
                  const d = dateStr ? new Date(dateStr) : null;
                  const dateLabel = d
                    ? `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
                    : '';
                  const stepColor = task.status === 'failed' ? '#ef4444' : undefined;
                  const StepIcon = task.status === 'completed' ? StepIconCheck
                    : task.status === 'failed' ? StepIconFail
                    : task.status === 'running' ? StepIconPlay
                    : StepIconCircle;
                  const isLast = i === selectedTasks.length - 1;
                  return (
                    <React.Fragment key={task.task_id || i}>
                      <StepNode $status={status}>
                        <StepCircle $status={task.status === 'failed' ? 'active' : status} $color={stepColor}>
                          <StepIcon />
                        </StepCircle>
                        <StepLabel>{task.title || task.task_id}</StepLabel>
                        <StepDate>{dateLabel}</StepDate>
                      </StepNode>
                      {!isLast && (
                        <StepConnector
                          $done={status === 'done'}
                          $color={stepColor}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </StepperWrap>
            </TimelineBody>

            <PanelFooter>
              <FooterStat>
                {selectedTasks.filter((t: any) => t.status === 'completed').length} / {selectedTasks.length} completed
              </FooterStat>
              <ProgressMini>
                <ProgressTrack>
                  <ProgressFill $pct={
                    selectedTasks.length > 0
                      ? Math.round((selectedTasks.filter((t: any) => t.status === 'completed').length / selectedTasks.length) * 100)
                      : 0
                  } />
                </ProgressTrack>
                <ProgressLabel>
                  {selectedTasks.length > 0
                    ? Math.round((selectedTasks.filter((t: any) => t.status === 'completed').length / selectedTasks.length) * 100)
                    : 0}%
                </ProgressLabel>
              </ProgressMini>
            </PanelFooter>
          </FloatingPanel>
        </>,
        document.body
      )}
    </SceneContainer>
  );
};

export default AgentPanel;
