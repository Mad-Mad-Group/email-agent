import React from 'react';
import styled from 'styled-components';

/* ══════════════════════════════════════
   DiceBearAvatar — Generated SVG avatar via dicebear.com
   No npm dependency; hits api.dicebear.com/9.x directly.
   Seed is the stable per-user identifier (email / user_id) so the
   same user always renders the same face.
   ══════════════════════════════════════ */

type DiceStyle = 'bottts' | 'lorelei' | 'notionists' | 'thumbs' | 'pixel-art';

const Wrap = styled.div<{ $size: number; $radius: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: ${({ $radius }) => $radius}px;
  overflow: hidden;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  display: flex;
  align-items: center;
  justify-content: center;

  & > img {
    width: 100%;
    height: 100%;
    display: block;
  }
`;

export interface DiceBearAvatarProps {
  /** Stable identifier — same value always renders the same avatar */
  seed: string;
  /** DiceBear style preset (default: bottts — suits sci-fi / pixel-art aesthetic) */
  diceStyle?: DiceStyle;
  /** Display size in px (default: 36) */
  size?: number;
  /** Corner radius in px. Pass size/2 for round, 10 for square (default: 18 = round) */
  radius?: number;
  /** Optional override for the full URL (escape hatch for tests / offline) */
  url?: string;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

const DiceBearAvatar: React.FC<DiceBearAvatarProps> = ({
  seed,
  diceStyle = 'bottts',
  size = 36,
  radius = 18,
  url,
  className,
  style,
  alt,
}) => {
  // ponytail: dicebear is deterministic on `seed`; URL params only set the preset.
  // encodeURIComponent guards against `+`, `#`, spaces in user-typed identifiers.
  const src = url ?? `https://api.dicebear.com/9.x/${diceStyle}/svg?seed=${encodeURIComponent(seed)}&radius=0`;

  return (
    <Wrap $size={size} $radius={radius} className={className} style={style}>
      <img src={src} alt={alt ?? seed} loading="lazy" />
    </Wrap>
  );
};

export default DiceBearAvatar;
