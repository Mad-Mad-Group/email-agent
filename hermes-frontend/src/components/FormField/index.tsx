import React from 'react';
import styled, { css } from 'styled-components';
import { glassSurfaceLight } from '../../styles/glassSurface';

interface Option {
  label: string;
  value: string;
}

interface FormFieldProps {
  label: string;
  type?: 'text' | 'password' | 'email' | 'select' | 'textarea';
  value: string;
  onChange: (value: string) => void;
  options?: Option[];
  placeholder?: string;
  rows?: number;
  error?: string;
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs}px;
`;

const Label = styled.label`
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const inputStyles = `
  width: 100%;
  box-sizing: border-box;
`;

const errorBorder = css`
  border-color: #e53e3e;
  background: #fff5f5;
  &:focus { border-color: #e53e3e; }
`;

const Input = styled.input<{ $error?: boolean }>`
  ${inputStyles}
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 0.875rem;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  ${glassSurfaceLight};
  color: ${({ theme }) => theme.colors.textPrimary};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textTertiary};
  }

  ${({ $error }) => $error && errorBorder}
`;

const Textarea = styled.textarea<{ $error?: boolean }>`
  ${inputStyles}
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 0.875rem;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  ${glassSurfaceLight};
  color: ${({ theme }) => theme.colors.textPrimary};
  outline: none;
  resize: vertical;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textTertiary};
  }

  ${({ $error }) => $error && errorBorder}
`;

const Select = styled.select`
  ${inputStyles}
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 0.875rem;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border-radius: ${({ theme }) => theme.radii.control}px;
  ${glassSurfaceLight};
  color: ${({ theme }) => theme.colors.textPrimary};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

const ErrorHint = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #e53e3e;
`;

const InfoCircle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export const FormField: React.FC<FormFieldProps> = ({ label, type = 'text', value, onChange, options, placeholder, rows = 3, error }) => (
  <Wrapper>
    <Label>{label}</Label>
    {type === 'select' ? (
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    ) : type === 'textarea' ? (
      <Textarea $error={!!error} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} />
    ) : (
      <Input $error={!!error} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    )}
    {error && <ErrorHint><InfoCircle /> {error}</ErrorHint>}
  </Wrapper>
);

export default FormField;
