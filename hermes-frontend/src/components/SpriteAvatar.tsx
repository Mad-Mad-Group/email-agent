import React from 'react';
import styled, { keyframes } from 'styled-components';

/* ══════════════════════════════════════
   SpriteAvatar — Animated pixel sprite avatar
   Reusable across Dashboard, Leads, Email, Tasks
   ══════════════════════════════════════ */

const spriteAnim = (frames: number, frameW: number) => keyframes`
  from { background-position-x: 0; }
  to   { background-position-x: -${frames * frameW}px; }
`;

const Sprite = styled.div<{
  $src: string; $frames: number; $frameW: number; $frameH: number; $size: number;
}>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  background: url(${({ $src }) => $src}) no-repeat 0 0;
  background-size: ${({ $frames, $size }) => $frames * $size}px ${({ $size }) => $size}px;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
  animation: ${({ $frames, $size }) => spriteAnim($frames, $size)} ${({ $frames }) => $frames * 0.18}s steps(${({ $frames }) => $frames}) infinite;
  flex-shrink: 0;
`;

interface SpriteAvatarProps {
  src: string;
  frames: number;
  frameW: number;
  frameH: number;
  /** Display size in px (default: 28) */
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

const SpriteAvatar: React.FC<SpriteAvatarProps> = ({
  src, frames, frameW, frameH, size = 28, style, className,
}) => (
  <Sprite
    $src={src} $frames={frames} $frameW={frameW} $frameH={frameH} $size={size}
    style={style} className={className}
  />
);

export default SpriteAvatar;
