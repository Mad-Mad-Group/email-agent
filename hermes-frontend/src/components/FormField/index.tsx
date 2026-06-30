import React from 'react';
import styled from 'styled-components';

interface Option {
  label: string;
  value: string;
}

interface FormFieldProps {
  label: string;
  type?: 'text' | 'password' | 'email' | 'select';
  value: string;
  onChange: (value: string) => void;
  options?: Option[];
  placeholder?: string;
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

const Input = styled.input`
  ${inputStyles}
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 0.875rem;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textPrimary};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.blue};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textTertiary};
  }
`;

const Select = styled.select`
  ${inputStyles}
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 0.875rem;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textPrimary};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.blue};
  }
`;

export const FormField: React.FC<FormFieldProps> = ({ label, type = 'text', value, onChange, options, placeholder }) => (
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
    ) : (
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    )}
  </Wrapper>
);

export default FormField;
