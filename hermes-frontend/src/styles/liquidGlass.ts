import { css } from 'styled-components';

/**
 * Liquid glass surfaces.
 *
 * Derived from the pastel stat cards on the Dashboard (`ActionCard`), which are
 * the reference look: a diagonal translucent gradient over a blurred+saturated
 * backdrop, a light hairline border, and an inset top highlight that reads as a
 * lit glass edge.
 *
 * Two caveats worth knowing before reaching for these:
 *
 * 1. `backdrop-filter` blurs what is *behind* the element. Over a flat white
 *    panel there is nothing to blur, so the effect is invisible and you only
 *    pay the compositing cost. Use these where something shows through.
 * 2. Each one creates a compositing layer. Dozens inside a scrolling list will
 *    drop frames on phones — prefer `glassPill` (a cheaper blur) for anything
 *    that repeats per row.
 */

/* Tuning shared by every variant so they read as one material */
const BLUR = '20px';
const SATURATE = '1.4';

/** Card-sized neutral glass. Drop-in replacement for `glassSurface`. */
export const liquidGlass = css`
  position: relative;
  border-radius: ${({ theme }) => theme.radii.card}px;
  background: ${({ theme }) => theme.mode === 'dark'
    ? 'linear-gradient(135deg, rgba(38,34,38,0.78) 0%, rgba(22,19,22,0.55) 100%)'
    : 'linear-gradient(135deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.48) 100%)'};
  backdrop-filter: blur(${BLUR}) saturate(${SATURATE});
  -webkit-backdrop-filter: blur(${BLUR}) saturate(${SATURATE});
  border: 1px solid ${({ theme }) => theme.mode === 'dark'
    ? 'rgba(255,255,255,0.10)'
    : 'rgba(255,255,255,0.55)'};
  box-shadow: ${({ theme }) => theme.mode === 'dark'
    ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 12px rgba(0,0,0,0.30)'
    : 'inset 0 1px 0 rgba(255,255,255,0.60), 0 2px 12px rgba(0,0,0,0.06)'};
`;

/**
 * Tinted card glass — the literal Dashboard recipe. Pass a `theme.pastel` hue.
 * Kept separate because the tint has to come from a prop.
 */
export const liquidGlassTinted = (hue: string) => css`
  position: relative;
  border-radius: ${({ theme }) => theme.radii.card}px;
  background: linear-gradient(135deg, ${hue}cc 0%, ${hue}55 100%);
  backdrop-filter: blur(${BLUR}) saturate(${SATURATE});
  -webkit-backdrop-filter: blur(${BLUR}) saturate(${SATURATE});
  border: 1px solid ${hue}66;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 12px rgba(0,0,0,0.06);
`;

/**
 * Pills, chips and status badges. Cheaper blur (these repeat per table row) and
 * a tighter highlight suited to a small rounded shape.
 */
export const glassPill = css`
  background: ${({ theme }) => theme.mode === 'dark'
    ? 'linear-gradient(135deg, rgba(48,44,48,0.72) 0%, rgba(28,25,28,0.52) 100%)'
    : 'linear-gradient(135deg, rgba(255,255,255,0.80) 0%, rgba(255,255,255,0.50) 100%)'};
  backdrop-filter: blur(10px) saturate(1.3);
  -webkit-backdrop-filter: blur(10px) saturate(1.3);
  border: 1px solid ${({ theme }) => theme.mode === 'dark'
    ? 'rgba(255,255,255,0.12)'
    : 'rgba(255,255,255,0.65)'};
  box-shadow: ${({ theme }) => theme.mode === 'dark'
    ? 'inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 4px rgba(0,0,0,0.24)'
    : 'inset 0 1px 0 rgba(255,255,255,0.70), 0 1px 4px rgba(0,0,0,0.06)'};
`;

/**
 * The recessed track a pill group sits in (e.g. the Leads tab bar). Reads as
 * the inverse of `glassPill` — pressed in rather than raised.
 */
export const glassTrack = css`
  background: ${({ theme }) => theme.mode === 'dark'
    ? 'rgba(255,255,255,0.04)'
    : 'rgba(11,8,11,0.035)'};
  backdrop-filter: blur(8px) saturate(1.2);
  -webkit-backdrop-filter: blur(8px) saturate(1.2);
  border: 1px solid ${({ theme }) => theme.mode === 'dark'
    ? 'rgba(255,255,255,0.07)'
    : 'rgba(11,8,11,0.05)'};
  box-shadow: ${({ theme }) => theme.mode === 'dark'
    ? 'inset 0 1px 2px rgba(0,0,0,0.28)'
    : 'inset 0 1px 2px rgba(11,8,11,0.05)'};
`;

/**
 * Avatars. The highlight wraps the whole rim rather than sitting only on top,
 * which is what makes a circle read as a glass bead.
 */
export const glassAvatar = css`
  /* Sheen goes on background-image so it layers over whatever background-color
     the avatar already sets — no need to know if that colour is a hex, an rgba
     or a theme token. Apply this AFTER the background declaration.
     NOTE: this claims background-image. For an avatar that shows a sprite or
     photo via background-image: url(), use glassAvatarEdge instead. */
  background-image: linear-gradient(135deg,
    rgba(255,255,255,0.38) 0%,
    rgba(255,255,255,0.04) 55%,
    rgba(255,255,255,0.16) 100%);
  backdrop-filter: blur(12px) saturate(${SATURATE});
  -webkit-backdrop-filter: blur(12px) saturate(${SATURATE});
  border: 1px solid ${({ theme }) => theme.mode === 'dark'
    ? 'rgba(255,255,255,0.14)'
    : 'rgba(255,255,255,0.70)'};
  box-shadow: ${({ theme }) => theme.mode === 'dark'
    ? 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.20), 0 2px 6px rgba(0,0,0,0.28)'
    : 'inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 0 rgba(11,8,11,0.06), 0 2px 6px rgba(0,0,0,0.10)'};
`;

/**
 * Secondary / ghost buttons only. Primary actions deliberately stay solid —
 * a translucent primary button loses the visual weight that marks it primary.
 */
export const glassGhostButton = css`
  background: ${({ theme }) => theme.mode === 'dark'
    ? 'linear-gradient(135deg, rgba(48,44,48,0.70) 0%, rgba(28,25,28,0.48) 100%)'
    : 'linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.45) 100%)'};
  backdrop-filter: blur(10px) saturate(1.3);
  -webkit-backdrop-filter: blur(10px) saturate(1.3);
  border: 1px solid ${({ theme }) => theme.mode === 'dark'
    ? 'rgba(255,255,255,0.12)'
    : 'rgba(255,255,255,0.60)'};
  box-shadow: ${({ theme }) => theme.mode === 'dark'
    ? 'inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 4px rgba(0,0,0,0.22)'
    : 'inset 0 1px 0 rgba(255,255,255,0.65), 0 1px 4px rgba(0,0,0,0.05)'};
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark'
      ? 'linear-gradient(135deg, rgba(58,54,58,0.80) 0%, rgba(34,31,34,0.58) 100%)'
      : 'linear-gradient(135deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.60) 100%)'};
  }
`;

/**
 * Rim only — no sheen layer, so it leaves `background-image` alone. Use this for
 * avatars that show a sprite or photo through `background-image: url()`; the
 * sheen variant would paint over the image and the avatar would go blank.
 */
export const glassAvatarEdge = css`
  backdrop-filter: blur(12px) saturate(${SATURATE});
  -webkit-backdrop-filter: blur(12px) saturate(${SATURATE});
  border: 1px solid ${({ theme }) => theme.mode === 'dark'
    ? 'rgba(255,255,255,0.14)'
    : 'rgba(255,255,255,0.70)'};
  box-shadow: ${({ theme }) => theme.mode === 'dark'
    ? 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.20), 0 2px 6px rgba(0,0,0,0.28)'
    : 'inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 0 rgba(11,8,11,0.06), 0 2px 6px rgba(0,0,0,0.10)'};
`;

/**
 * Tinted pill — deliberately much lighter than the Dashboard cards.
 *
 * The cards run their tint at cc→55 (80%→33%) because they carry no small text.
 * A badge does, and dark serif text on a 33%+ tint is hard to read, so this runs
 * at 59→2b (35%→17%) — lighter than the card recipe, not just equal to it.
 * Pair with `theme.colors.textPrimary`, which is dark in light mode and light in
 * dark mode, so contrast holds either way.
 */
export const glassPillTinted = (hue: string) => css`
  background: linear-gradient(135deg, ${hue}59 0%, ${hue}2b 100%);
  backdrop-filter: blur(10px) saturate(1.3);
  -webkit-backdrop-filter: blur(10px) saturate(1.3);
  border: 1px solid ${hue}80;
  box-shadow: ${({ theme }) => theme.mode === 'dark'
    ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 3px rgba(0,0,0,0.22)'
    : 'inset 0 1px 0 rgba(255,255,255,0.55), 0 1px 3px rgba(0,0,0,0.05)'};
`;
