import { css } from 'styled-components';

/**
 * Card surface — solid white bg + soft shadow. Replaces glassSurface.
 */
export const glassSurface = css`
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
