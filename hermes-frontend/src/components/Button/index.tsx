import React from 'react';
import styled, { css } from 'styled-components';

interface ButtonProps {
  variant?: 'default' | 'primary' | 'sm';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const primaryStyles = css`
  background: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.textInverted};
  border-color: transparent;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.strong.blue};
    background: ${({ theme }) => theme.colors.accent};
  }
`;

const smStyles = css`
  padding: ${({ theme }) => theme.spacing.xs}px ${({ theme }) => theme.spacing.sm}px;
  font-size: 0.75rem;
`;

const StyledButton = styled.button<{ $variant: string }>`
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 0.875rem;
  font-weight: 500;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border-radius: ${({ theme }) => theme.radii.control}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textPrimary};
  cursor: pointer;
  transition: background 160ms var(--ease-out), border-color 160ms var(--ease-out), opacity 160ms var(--ease-out), transform 160ms var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      border-color: ${({ theme }) => theme.colors.borderStrong};
      background: ${({ theme }) => theme.colors.surfaceMuted};
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${({ $variant }) => $variant === 'primary' && primaryStyles}
  ${({ $variant }) => $variant === 'sm' && smStyles}
`;

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  children,
  onClick,
  disabled,
  type = 'button',
}) => (
  <StyledButton $variant={variant} onClick={onClick} disabled={disabled} type={type}>
    {children}
  </StyledButton>
);

export default Button;
