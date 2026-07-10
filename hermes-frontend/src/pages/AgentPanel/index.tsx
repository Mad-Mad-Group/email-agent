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

/* ── Agent label positions (ground starts ~58%) ── */
const AGENT_POSITIONS: Record<string, { top: string; left: string }> = {
  S1: { top: '58%', left: '15%' },  /* Fox — left ground */
  S2: { top: '62%', left: '32%' },  /* Cow — center-left pasture */
  S3: { top: '56%', left: '72%' },  /* Chicken — right field */
  S4: { top: '70%', left: '38%' },  /* Duck — river */
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

/* ── Animal movement: stop 4s → move 1s → stop 4s → return 1s (10s cycle) ── */
const beeFloat = keyframes`
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(30px, -14px); }
  50% { transform: translate(55px, -6px); }
  75% { transform: translate(22px, -20px); }
`;

const sheepWalk = keyframes`
  0%, 40% { transform: translate(0, 0); }
  50% { transform: translate(-50px, 5px); }
  50.1%, 90% { transform: translate(-50px, 5px); }
  100% { transform: translate(0, 0); }
`;

const bunnyHop = keyframes`
  0%, 40% { transform: translate(0, 0); }
  43% { transform: translate(25px, -12px); }
  46% { transform: translate(50px, 0); }
  50% { transform: translate(75px, 0); }
  50.1%, 90% { transform: translate(75px, 0); }
  94% { transform: translate(50px, -12px); }
  97% { transform: translate(25px, 0); }
  100% { transform: translate(0, 0); }
`;

const foxDart = keyframes`
  0%, 40% { transform: translate(0, 0); }
  50% { transform: translate(85px, -6px); }
  50.1%, 90% { transform: translate(85px, -6px); }
  100% { transform: translate(0, 0); }
`;

const cowGraze = keyframes`
  0%, 40% { transform: translate(0, 0); }
  50% { transform: translate(65px, 4px); }
  50.1%, 90% { transform: translate(65px, 4px); }
  100% { transform: translate(0, 0); }
`;

const chickenPeck = keyframes`
  0%, 40% { transform: translate(0, 0); }
  50% { transform: translate(55px, 3px); }
  50.1%, 90% { transform: translate(55px, 3px); }
  100% { transform: translate(0, 0); }
`;

const duckSwim = keyframes`
  0%, 40% { transform: translate(0, 0) scaleX(1); }
  50% { transform: translate(75px, 2px) scaleX(1); }
  50.1%, 90% { transform: translate(75px, 2px) scaleX(-1); }
  100% { transform: translate(0, 0) scaleX(1); }
`;

/* Gentle idle bob for non-running agents */
const gentleIdle = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(2px); }
`;

const AGENT_ANIMATIONS: Record<string, ReturnType<typeof keyframes>> = {
  S1: foxDart,
  S2: cowGraze,
  S3: chickenPeck,
  S4: duckSwim,
};

const AGENT_ANIM_DURATION: Record<string, number> = {
  S1: 10,
  S2: 10,
  S3: 10,
  S4: 12,
};

/* ── Decorative animals: cow×2, sheep×2, chicken×2, bunny×2, bee×3 ── */
const DECO_ANIMALS: Array<{
  sprite: string; frames: number; frameSize: number; top: string; left: string;
  anim: ReturnType<typeof keyframes>; dur: number; scale: number; delay: number; flip?: boolean;
}> = [
  /* Cows ×2 — center pasture (away from trees) */
  { sprite: '/assets/pixel-world/sprites/cow-idle.png', frames: 5, frameSize: 48, top: '66%', left: '36%', anim: cowGraze, dur: 10, scale: 2.5, delay: 0 },
  { sprite: '/assets/pixel-world/sprites/cow-idle.png', frames: 5, frameSize: 48, top: '74%', left: '48%', anim: cowGraze, dur: 12, scale: 2.5, delay: 3, flip: true },
  /* Sheep ×2 — center-left */
  { sprite: '/assets/pixel-world/sprites/sheep-idle.png', frames: 5, frameSize: 48, top: '70%', left: '55%', anim: sheepWalk, dur: 11, scale: 2.5, delay: 1 },
  { sprite: '/assets/pixel-world/sprites/sheep-idle.png', frames: 5, frameSize: 48, top: '76%', left: '42%', anim: sheepWalk, dur: 13, scale: 2.5, delay: 5, flip: true },
  /* Chickens ×2 — right field */
  { sprite: '/assets/pixel-world/sprites/chicken-idle.png', frames: 5, frameSize: 48, top: '63%', left: '78%', anim: chickenPeck, dur: 10, scale: 2, delay: 0.5 },
  { sprite: '/assets/pixel-world/sprites/chicken-idle.png', frames: 5, frameSize: 48, top: '70%', left: '65%', anim: chickenPeck, dur: 11, scale: 2, delay: 2, flip: true },
  /* Bunnies ×2 — scattered */
  { sprite: '/assets/pixel-world/sprites/bunny-idle.png', frames: 4, frameSize: 48, top: '78%', left: '52%', anim: bunnyHop, dur: 12, scale: 2, delay: 0 },
  { sprite: '/assets/pixel-world/sprites/bunny-idle.png', frames: 4, frameSize: 48, top: '80%', left: '88%', anim: bunnyHop, dur: 14, scale: 2, delay: 6, flip: true },
  /* Bees ×3 — sky */
  { sprite: '/assets/pixel-world/sprites/bee-idle.png', frames: 4, frameSize: 16, top: '12%', left: '25%', anim: beeFloat, dur: 8, scale: 3, delay: 0 },
  { sprite: '/assets/pixel-world/sprites/bee-idle.png', frames: 4, frameSize: 16, top: '18%', left: '55%', anim: beeFloat, dur: 9, scale: 2.5, delay: 2 },
  { sprite: '/assets/pixel-world/sprites/bee-idle.png', frames: 4, frameSize: 16, top: '8%', left: '80%', anim: beeFloat, dur: 7, scale: 2.5, delay: 4 },
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
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
  display: inline-flex;
  align-items: center;
  align-self: center;
  gap: 4px;
  padding: 3px 8px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  border-radius: 4px;
  transition: transform 0.18s, background 0.18s, box-shadow 0.18s;
  white-space: nowrap;
  width: fit-content;
`;

const LabelStatusDot = styled.span<{ $isRunning: boolean; $accent: string }>`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $isRunning, $accent }) => $isRunning ? $accent : '#6b7280'};
  ${({ $isRunning, $accent }) => $isRunning && css`
    box-shadow: 0 0 6px ${$accent}, 0 0 2px ${$accent};
  `}
`;

const LabelName = styled.span`
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: 10px;
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

const AgentStatusTag = styled.span<{ $running: boolean }>`
  font-size: 10px;
  line-height: 1;
`;

/* ── Left-top status panel — agent avatars + status ── */
const StatusPanel = styled.div`
  position: absolute;
  top: 56px;
  left: 16px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 5px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const StatusAvatar = styled.div<{ $src: string }>`
  width: 24px;
  height: 24px;
  background-image: url(${({ $src }) => $src});
  background-size: auto 24px;
  background-position: 0 0;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  flex-shrink: 0;
`;

const StatusName = styled.span`
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  min-width: 48px;
`;

const StatusBadge = styled.span<{ $running: boolean }>`
  font-size: 9px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  background: ${({ $running }) => $running ? 'rgba(34,197,94,0.2)' : 'rgba(148,163,184,0.15)'};
  color: ${({ $running }) => $running ? '#4ade80' : '#94a3b8'};
  white-space: nowrap;
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
  transform: rotate(${({ $open }) => $open ? '180deg' : '0'});
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

/* ── Farmer NPC — bottom-left, clickable with speech bubble ── */
const farmerBounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
`;

const bubblePop = keyframes`
  0% { opacity: 0; transform: translate(-50%, 4px) scale(0.8); }
  15% { opacity: 1; transform: translate(-50%, 0) scale(1.02); }
  25% { opacity: 1; transform: translate(-50%, 0) scale(1); }
  85% { opacity: 1; transform: translate(-50%, 0) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -6px) scale(0.95); }
`;

const FarmerWrap = styled.div`
  position: absolute;
  bottom: 1%;
  left: 36%;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  user-select: none;
  animation: ${farmerBounce} 3s ease-in-out infinite;

  &:hover {
    filter: brightness(1.15);
  }
`;

const FarmerBubble = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  margin-bottom: 4px;
  padding: 6px 10px;
  background: rgba(10, 10, 20, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  white-space: nowrap;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 600;
  color: #f87171;
  text-shadow: 0 0 6px rgba(248,113,113,0.4);
  animation: ${bubblePop} 3.5s ease forwards;
  pointer-events: none;
  image-rendering: pixelated;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: rgba(10, 10, 20, 0.85);
  }
`;

const FarmerLabel = styled.div`
  margin-top: 2px;
  padding: 2px 8px;
  background: rgba(0,0,0,0.6);
  border-radius: 3px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: #fbbf24;
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
  const [farmerTalk, setFarmerTalk] = useState(0); // increment to trigger bubble

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

      {/* ── Status panel — top-left, below title ── */}
      <StatusPanel>
        {agentCards.map((ag) => {
          const sprite = AGENT_SPRITES[ag.skill];
          const isRunning = ag.status === 'running';
          return (
            <StatusRow key={ag.skill} onClick={() => setSelectedSkill(ag.skill)}>
              <StatusAvatar $src={sprite?.idle ?? ''} />
              <StatusName>{ag.name}</StatusName>
              <StatusBadge $running={isRunning}>
                {isRunning ? '開工了' : '休息中'}
              </StatusBadge>
            </StatusRow>
          );
        })}
      </StatusPanel>

      {/* ── Decorative animals (extra animals per zone, no labels) ── */}
      {DECO_ANIMALS.map((d, i) => (
        <DecoAnimalWrap key={`deco-${i}`} $top={d.top} $left={d.left} $flip={d.flip}>
          <SpriteMotion $anim={d.anim} $dur={d.dur} style={{ animationDelay: `${d.delay}s` }}>
            <SpriteAnimator src={d.sprite} frameCount={d.frames} frameSize={d.frameSize} scale={d.scale} fps={d.frameSize === 16 ? 6 : 4} />
          </SpriteMotion>
        </DecoAnimalWrap>
      ))}

      {/* ── Main agent animals with labels (label + status above sprite, all follow movement) ── */}
      {agentCards.map((ag) => {
        const c = AGENT_COLORS[ag.skill] ?? AGENT_COLORS.S1;
        const pos = AGENT_POSITIONS[ag.skill];
        const sprite = AGENT_SPRITES[ag.skill];
        const isRunning = ag.status === 'running';
        const motionAnim = isRunning ? (AGENT_ANIMATIONS[ag.skill] ?? foxDart) : gentleIdle;
        const motionDur = isRunning ? (AGENT_ANIM_DURATION[ag.skill] ?? 10) : 3;
        return (
          <AgentLabelWrap
            key={ag.skill}
            $top={pos.top}
            $left={pos.left}
            style={{ animationDelay: `${['S1','S2','S3','S4'].indexOf(ag.skill) * 0.08}s` }}
            onClick={() => setSelectedSkill(ag.skill)}
          >
            <SpriteMotion $anim={motionAnim} $dur={motionDur}>
              <AgentLabel>
                <LabelStatusDot $isRunning={isRunning} $accent={c.accent} />
                <LabelName>{ag.name}</LabelName>
                <AgentStatusTag $running={isRunning}>
                  {isRunning ? '⚡' : '💤'}
                </AgentStatusTag>
              </AgentLabel>
              {sprite && (
                <SpriteAnimator
                  src={sprite.idle}
                  frameCount={sprite.frames}
                  frameSize={48}
                  scale={4}
                  fps={isRunning ? 5 : 2}
                />
              )}
            </SpriteMotion>
          </AgentLabelWrap>
        );
      })}

      {/* ── Farmer NPC — bottom-left corner ── */}
      <FarmerWrap onClick={() => setFarmerTalk((v) => v + 1)}>
        {farmerTalk > 0 && (
          <FarmerBubble key={farmerTalk}>
            💢 加油努力！不然把你們送去M記！
          </FarmerBubble>
        )}
        <SpriteAnimator
          src="/assets/pixel-world/sprites/farmer-idle.png"
          frameCount={4}
          frameSize={80}
          scale={4.5}
          fps={3}
        />
        <FarmerLabel>農場主</FarmerLabel>
      </FarmerWrap>

      {/* ── Activity feed overlay — right edge ── */}
      <ActivityPanel $open={feedOpen}>
        <ActivityHeader>
          <ActivityToggle $open={feedOpen} onClick={() => setFeedOpen((v) => !v)} title={feedOpen ? 'Collapse' : 'Expand'}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4l-4 4 4 4"/></svg>
          </ActivityToggle>
          <ActivityTitle>{feedOpen ? 'ACTIVITY LOG' : ''}</ActivityTitle>
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
