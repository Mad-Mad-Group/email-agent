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

/* ── Cropped variant ──
   Some sheets frame their subject very loosely: the farmer sprites draw a 16x19
   figure inside an 80x80 cell, so 82% of the box is transparent. Rendered whole,
   the character looks tiny and leaves a wide empty gap next to it. Given the
   opaque region, this scales that region instead of the whole cell. */

const croppedAnim = (frames: number, frameW: number, k: number, trimX: number) => keyframes`
  from { background-position-x: ${-trimX * k}px; }
  to   { background-position-x: ${-(trimX + frames * frameW) * k}px; }
`;

const CroppedSprite = styled.div<{
  $src: string; $frames: number; $frameW: number; $frameH: number;
  $trimX: number; $trimY: number; $trimW: number; $trimH: number; $k: number;
}>`
  width: ${({ $trimW, $k }) => Math.round($trimW * $k)}px;
  height: ${({ $trimH, $k }) => Math.round($trimH * $k)}px;
  background: url(${({ $src }) => $src}) no-repeat;
  background-size: ${({ $frames, $frameW, $k }) => $frames * $frameW * $k}px ${({ $frameH, $k }) => $frameH * $k}px;
  background-position-y: ${({ $trimY, $k }) => -$trimY * $k}px;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
  animation: ${({ $frames, $frameW, $k, $trimX }) => croppedAnim($frames, $frameW, $k, $trimX)}
    ${({ $frames }) => $frames * 0.18}s steps(${({ $frames }) => $frames}) infinite;
  flex-shrink: 0;
`;

/** Opaque region within a frame, in source pixels. Must cover every frame. */
export interface SpriteTrim {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SpriteAvatarProps {
  src: string;
  frames: number;
  frameW: number;
  frameH: number;
  /** Display size in px (default: 28). With `trim`, this is the character's height. */
  size?: number;
  /**
   * Crop to the drawn subject instead of the whole cell. For sheets with heavy
   * transparent padding; `size` then sets the subject's rendered height and the
   * element's width follows the trim's aspect ratio.
   */
  trim?: SpriteTrim;
  style?: React.CSSProperties;
  className?: string;
}

const SpriteAvatar: React.FC<SpriteAvatarProps> = ({
  src, frames, frameW, frameH, size = 28, trim, style, className,
}) => {
  if (trim) {
    return (
      <CroppedSprite
        $src={src} $frames={frames} $frameW={frameW} $frameH={frameH}
        $trimX={trim.x} $trimY={trim.y} $trimW={trim.w} $trimH={trim.h}
        $k={size / trim.h}
        style={style} className={className}
      />
    );
  }
  return (
    <Sprite
      $src={src} $frames={frames} $frameW={frameW} $frameH={frameH} $size={size}
      style={style} className={className}
    />
  );
};

export default SpriteAvatar;
