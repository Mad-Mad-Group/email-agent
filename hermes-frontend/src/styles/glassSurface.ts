import { css } from 'styled-components';
import { liquidGlass } from './liquidGlass';

/**
 * Card surface — liquid glass, matching the Dashboard's pastel stat cards.
 *
 * This was previously a solid white fill. Every card in the app routes through
 * here, so the definition lives in ./liquidGlass and this stays an alias.
 */
export const glassSurface = liquidGlass;

/** Solid fill, for the few places translucency hurts legibility. */
export const solidSurface = css`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
  border-radius: ${({ theme }) => theme.radii.card}px;
`;

/**
 * Alias — kept for sidebar/topbar imports that haven't been updated yet.
 */
export const glassFrosted = glassSurface;

/**
 * Light variant for nested elements (inputs, table headers).
 */
export const glassSurfaceLight = css`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;
