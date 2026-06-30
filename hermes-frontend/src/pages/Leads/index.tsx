import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useLeads, useDeleteLead, useChangeLeadStatus, useCreateLead } from '../../api/hooks';
import { Lead } from '../../api/leads';
import { media } from '../../styles/media';

/* ══════════════════════════════════════
   CMS Leads — Luno Contacts-style UI
   ══════════════════════════════════════ */

/* ── Inline SVG icons (16x16 viewBox) ── */

const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.5 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1 13.5c0-2.21 2.015-4 4.5-4s4.5 1.79 4.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11 7.5a2 2 0 1 0 0-4M12.5 13.5c0-1.58-.95-2.96-2.38-3.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconSparkle = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1v2.5M8 12.5V15M15 8h-2.5M3.5 8H1M12.95 3.05l-1.77 1.77M4.82 11.18l-1.77 1.77M3.05 3.05l1.77 1.77M11.18 11.18l1.77 1.77" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M8 4.5V8l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconCheckCircle = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5.5 8l1.75 1.75L10.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 4.5h11M5.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M12 4.5l-.5 8.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1L4 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconSortArrow = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: 4, opacity: 0.4 }}>
    <path d="M5 1v8M2 6l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconLeadScraper = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="#3b82f6"/>
    <path d="M13 17a7 7 0 0 1 14 0" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="20" cy="15" r="3.5" stroke="#fff" strokeWidth="1.8"/>
    <path d="M11 28c0-3.87 4.03-7 9-7s9 3.13 9 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

/* ── Avatar color from name hash ── */

const hashColor = (name: string): string => {
  const colors = ['#3b82f6', '#2563eb', '#f59e0b', '#ef4444', '#1d4ed8', '#94a3b8', '#10b981', '#94a3b8'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

/* ── Layout ── */

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md}px;
`;

const Breadcrumb = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm}px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  li + li::before {
    content: '/';
    margin-right: ${({ theme }) => theme.spacing.sm}px;
  }
  a {
    color: ${({ theme }) => theme.colors.textSecondary};
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }
`;

const TitleRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const PageTitle = styled.h1`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const PageSub = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: 0.8125rem;
`;

/* ── KPI Cards Row ── */

const KpiRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing.md}px;
  ${media.tabletDown} { grid-template-columns: repeat(2, 1fr); }
  ${media.mobile} { grid-template-columns: 1fr; }
`;

const KpiCard = styled.div`
  background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md}px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04);
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }
`;

const KpiIconWrap = styled.div<{ $bg: string; $fg: string }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, ${({ $bg }) => $bg} 0%, ${({ $bg }) => $bg}cc 100%);
  color: ${({ $fg }) => $fg};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  svg { width: 22px; height: 22px; }
`;

const KpiText = styled.div`
  display: flex;
  flex-direction: column;
`;

const KpiValue = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const KpiLabel = styled.span`
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

/* ── Profile Header Card ── */

const ProfileCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: ${({ theme }) => theme.spacing.lg}px;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.lg}px;
  ${media.mobile} { flex-direction: column; text-align: center; }
`;

const ProfileInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ProfileTitle = styled.h2`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const ProfileSub = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(37,99,235,0.2), 0 2px 4px rgba(37,99,235,0.08), inset 0 1px 0 rgba(255,255,255,0.15);
  transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37,99,235,0.3), 0 2px 4px rgba(37,99,235,0.15), inset 0 1px 0 rgba(255,255,255,0.2);
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
  }
  &:active { transform: translateY(0); box-shadow: 0 1px 2px rgba(37,99,235,0.2); }
`;

/* ── Tabs Row ── */

const TabsRow = styled.div`
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  gap: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.card}px ${({ theme }) => theme.radii.card}px 0 0;
`;

const TabItem = styled.button<{ $active?: boolean }>`
  flex: none;
  padding: 14px ${({ theme }) => theme.spacing.lg}px;
  background: ${({ $active }) => $active
    ? 'linear-gradient(180deg, transparent 0%, rgba(37,99,235,0.04) 100%)'
    : 'transparent'};
  border: none;
  border-bottom: 2px solid ${({ $active, theme }) => $active ? theme.colors.blue : 'transparent'};
  margin-bottom: -1px;
  font-size: 0.8125rem;
  font-weight: ${({ $active }) => $active ? 700 : 500};
  color: ${({ $active, theme }) => $active ? theme.colors.blue : theme.colors.textSecondary};
  cursor: pointer;
  white-space: nowrap;
  position: relative;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  &:hover {
    color: ${({ theme }) => theme.colors.blue};
  }
`;

const TabCount = styled.span<{ $active?: boolean }>`
  display: inline-block;
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 0.6875rem;
  font-weight: 600;
  background: ${({ $active, theme }) => $active
    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
    : theme.colors.surfaceMuted};
  color: ${({ $active, theme }) => $active ? '#fff' : theme.colors.textTertiary};
`;

/* ── Search Bar ── */

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  background: ${({ theme }) => theme.colors.surface};
  ${media.mobile} { flex-direction: column; }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 9px ${({ theme }) => theme.spacing.md}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-size: 0.875rem;
  outline: none;
  min-width: 240px;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  transition: border-color 0.15s, box-shadow 0.15s;
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; }
  &:focus {
    border-color: ${({ theme }) => theme.colors.blue};
    box-shadow: 0 0 0 3px rgba(37,99,235,0.12), 0 1px 2px rgba(15,23,42,0.04);
  }
  &:hover:not(:focus) { border-color: ${({ theme }) => theme.colors.borderStrong}; }
  ${media.mobile} { min-width: 0; width: 100%; }
`;

/* ── Table ── */

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: 0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04);
  overflow: hidden;
`;

const TableWrap = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
  min-width: 960px;
  th, td {
    padding: 12px ${({ theme }) => theme.spacing.md}px;
    text-align: left;
    white-space: nowrap;
  }
  th {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.6875rem;
    letter-spacing: 0.03em;
    color: ${({ theme }) => theme.colors.textTertiary};
    background: linear-gradient(180deg, #fafbfc 0%, #f4f5f7 100%);
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    user-select: none;
    cursor: default;
  }
  ${media.mobile} {
    min-width: 640px;
    font-size: 0.75rem;
    th, td { padding: 8px ${({ theme }) => theme.spacing.sm}px; }
    th { font-size: 0.625rem; }
  }
`;

const TRow = styled.tr<{ $even?: boolean }>`
  background: ${({ $even, theme }) => $even
    ? 'linear-gradient(180deg, #fafbfc 0%, #f4f5f7 100%)'
    : theme.colors.surface};
  transition: background 0.15s ease;
  &:hover {
    background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
  }
  td { border-bottom: 1px solid ${({ theme }) => theme.colors.border}; }
  &:last-child td { border-bottom: none; }
`;

const NameCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Avatar = styled.div<{ $color: string }>`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${({ $color }) => $color} 0%, ${({ $color }) => $color}cc 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
  text-transform: uppercase;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2);
  border: 1.5px solid rgba(255,255,255,0.6);
`;

const NameText = styled.div`
  display: flex;
  flex-direction: column;
  strong {
    color: ${({ theme }) => theme.colors.textPrimary};
    font-size: 0.8125rem;
  }
  small {
    color: ${({ theme }) => theme.colors.textTertiary};
    font-size: 0.6875rem;
    margin-top: 1px;
  }
`;

const StatusBadge = styled.span<{ $status?: string }>`
  display: inline-block;
  padding: 3px 12px;
  border-radius: 99px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: capitalize;
  ${({ $status, theme }) => {
    const s = theme.status as Record<string, { bg: string; fg: string }>;
    const entry = s[$status ?? 'new'] ?? s.new;
    return `
      background: linear-gradient(135deg, ${entry.bg} 0%, ${entry.bg} 100%);
      color: ${entry.fg};
      box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    `;
  }}
`;

const TagList = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`;

const Tag = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.6875rem;
  background: linear-gradient(135deg, #f4f5f7 0%, #e5e7eb 100%);
  color: ${({ theme }) => theme.colors.textSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const ActionBtn = styled.button<{ $color: string }>`
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: ${({ $color }) => $color}22;
  color: ${({ $color }) => $color};
  cursor: pointer;
  margin-right: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s, background 0.15s, color 0.15s;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.4);
  &:hover {
    transform: translateY(-1px);
    background: ${({ $color }) => $color};
    color: #fff;
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }
`;

const EmptyCell = styled.td`
  text-align: center;
  padding: 48px ${({ theme }) => theme.spacing.md}px;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: 0.875rem;
`;

/* ── Pagination ── */

const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  ${media.mobile} { flex-direction: column; gap: 8px; }
`;

const PageBtns = styled.div`
  display: flex;
  gap: 4px;
`;

const PageBtn = styled.button<{ $active?: boolean }>`
  padding: 5px 12px;
  border: 1px solid ${({ $active, theme }) => $active ? 'transparent' : theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ $active }) => $active
    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
    : '#fff'};
  color: ${({ $active }) => $active ? '#fff' : '#475569'};
  font-size: 0.75rem;
  font-weight: ${({ $active }) => $active ? 600 : 500};
  cursor: pointer;
  box-shadow: ${({ $active }) => $active
    ? '0 2px 6px rgba(37,99,235,0.25), inset 0 1px 0 rgba(255,255,255,0.15)'
    : '0 1px 2px rgba(15,23,42,0.04)'};
  transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    ${({ $active }) => $active ? '' : 'background: #f4f5f7; border-color: #cbd5e1;'}
  }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

/* ── Modal ── */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  width: 520px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18);
  ${media.mobile} { width: 95%; }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textTertiary};
  &:hover { color: ${({ theme }) => theme.colors.textPrimary}; }
`;

const ModalBody = styled.div`
  padding: ${({ theme }) => theme.spacing.lg}px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md}px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md}px;
  ${media.mobile} { grid-template-columns: 1fr; }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.label`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Input = styled.input`
  padding: 9px ${({ theme }) => theme.spacing.sm}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-size: 0.8125rem;
  outline: none;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.surface};
  box-sizing: border-box;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  transition: border-color 0.15s, box-shadow 0.15s;
  &:hover:not(:focus) { border-color: ${({ theme }) => theme.colors.borderStrong}; }
  &:focus {
    border-color: ${({ theme }) => theme.colors.blue};
    box-shadow: 0 0 0 3px rgba(37,99,235,0.12), 0 1px 2px rgba(15,23,42,0.04);
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceMuted};
`;

const PrimaryBtn = styled.button`
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(37,99,235,0.2), 0 2px 4px rgba(37,99,235,0.08), inset 0 1px 0 rgba(255,255,255,0.15);
  transition: transform 0.15s, box-shadow 0.2s, background 0.2s;
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
    box-shadow: 0 4px 12px rgba(37,99,235,0.3), inset 0 1px 0 rgba(255,255,255,0.2);
  }
  &:active:not(:disabled) { transform: translateY(0); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SecondaryBtn = styled.button`
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.8125rem;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    border-color: ${({ theme }) => theme.colors.borderStrong};
    transform: translateY(-1px);
  }
`;

/* ── Footer ── */

const Footer = styled.footer`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.md}px 0;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  a {
    color: ${({ theme }) => theme.colors.textSecondary};
    text-decoration: none;
    margin-left: ${({ theme }) => theme.spacing.md}px;
  }
  a:hover { text-decoration: underline; }
`;

/* ── Detail Panel ── */

const dpFadeIn = keyframes`
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;

const DpOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1200;
`;

const DpPanel = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1201;
  width: 520px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22);
  animation: ${dpFadeIn} 0.2s ease-out;
  ${media.mobile} { width: 95%; }
`;

const DpHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const DpHeaderInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DpCompanyName = styled.h2`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const DpCloseBtn = styled.button`
  background: none;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textTertiary};
  padding: 4px;
  &:hover { color: ${({ theme }) => theme.colors.textPrimary}; }
`;

const DpBody = styled.div`
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const DpGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  ${media.mobile} { grid-template-columns: 1fr; }
`;

const DpField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const DpFieldLabel = styled.span`
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const DpFieldValue = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  word-break: break-word;
`;

const DpSectionTitle = styled.h3`
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

const DpTagList = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const DpTag = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const DpTimeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-left: 12px;
  border-left: 2px solid ${({ theme }) => theme.colors.border};
`;

const DpTimelineItem = styled.div<{ $active?: boolean }>`
  position: relative;
  padding: 8px 0 8px 16px;
  font-size: 0.8125rem;
  color: ${({ $active, theme }) => $active ? theme.colors.textPrimary : theme.colors.textTertiary};
  font-weight: ${({ $active }) => $active ? 600 : 400};

  &::before {
    content: '';
    position: absolute;
    left: -18px;
    top: 14px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $active, theme }) => $active ? theme.colors.blue : theme.colors.border};
    border: 2px solid ${({ theme }) => theme.colors.surface};
  }
`;

const DpFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const DpActionBtn = styled.button<{ $variant?: 'primary' | 'danger' }>`
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
  background: ${({ $variant, theme }) =>
    $variant === 'danger' ? '#ef4444' :
    $variant === 'primary' ? theme.colors.blue : theme.colors.surfaceMuted};
  color: ${({ $variant }) =>
    $variant === 'danger' ? '#fff' :
    $variant === 'primary' ? '#fff' : 'inherit'};
  &:hover { opacity: 0.85; }
`;

/* ── Helpers ── */

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const NEXT_STATUS: Record<string, string> = {
  new: 'pending',
  pending: 'contacted',
};

/* ── Tabs config (labels moved inside component for i18n) ── */

interface TabDef {
  key: string;
  label: string;
}

/* ══════════════════════════════════════
   Component
   ══════════════════════════════════════ */



const LIMIT = 10;

const Leads: React.FC = () => {
  const { t } = useTranslation();

  const TABS: TabDef[] = [
    { key: '', label: t('leads.allLeads') },
    { key: 'new', label: t('leads.new') },
    { key: 'pending', label: t('leads.pending') },
    { key: 'contacted', label: t('leads.contacted') },
  ];

  const STATUS_LABEL: Record<string, string> = {
    new: t('leads.setPending'),
    pending: t('leads.setContacted'),
  };

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [form, setForm] = useState({
    company_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
  });

  // 攞可攞到嘅全部 leads（backend DTO 限 limit ≤ 100）。
  // status/search filtering client side 做。
  const { data, isLoading, error, refetch } = useLeads({ page: 1, limit: 100 });

  const deleteLead = useDeleteLead();
  const changeStatus = useChangeLeadStatus();
  const createLead = useCreateLead();

  const apiLeads: Lead[] = data?.data ?? [];
  // 唔再 fall back 去 MOCK_LEADS —— backend 失敗應該 user-facing 出 error，
  // 唔可以悄悄 display demo 假資料。
  const allLeads: Lead[] = apiLeads;

  // Client-side filtering（search + status）
  const searchFiltered = search.trim()
    ? allLeads.filter(l => {
        const q = search.trim().toLowerCase();
        return (l.company_name || '').toLowerCase().includes(q) ||
               (l.email || '').toLowerCase().includes(q) ||
               (l.phone || '').toLowerCase().includes(q);
      })
    : allLeads;
  const statusFiltered = statusFilter
    ? searchFiltered.filter(l =>
        // 「新進」tab (key='new') 要 cover backend 寫嘅 null/undefined（同 KPI 一致，
        // 否則 KPI counter 顯示到數字但 filter 出 0 條）
        statusFilter === 'new'
          ? l.status === 'new' || l.status === null || l.status === undefined
          : l.status === statusFilter,
      )
    : searchFiltered;

  // Client-side pagination
  const total = statusFiltered.length;
  const totalPages = Math.ceil(total / LIMIT);
  const leads = statusFiltered.slice((page - 1) * LIMIT, page * LIMIT);

  // KPI 用全量數據計（唔受 filter 影響）
  // Backend convention: `status = null` 表示 NEW (see leads.service.ts findAll，
  // lead.schema.ts comment line 16) — KPI counter 要 cover 呢個 case，
  // 否則會永遠顯示 0。
  const stats = useMemo(() => {
    const isNew = (l: Lead) =>
      l.status === 'new' || l.status === null || l.status === undefined;
    return {
      total: allLeads.length,
      new: allLeads.filter(isNew).length,
      pending: allLeads.filter(l => l.status === 'pending').length,
      contacted: allLeads.filter(l => l.status === 'contacted').length,
    };
  }, [allLeads]);

  const handleDelete = (id: string) => {
    if (window.confirm(t('leads.confirmDelete'))) {
      deleteLead.mutate(id);
    }
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    changeStatus.mutate({ id, status: newStatus });
  };

  const handleTabClick = (key: string) => {
    setStatusFilter(key);
    setPage(1);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createLead.mutate(form as any, {
      onSuccess: () => {
        setShowAdd(false);
        setForm({ company_name: '', email: '', phone: '', website: '', address: '' });
      },
    });
  };

  const handleCloseDetail = useCallback(() => setSelectedLead(null), []);

  return (
    <Page>
      {/* KPI Cards */}
      <KpiRow>
        <KpiCard>
          <KpiIconWrap $bg="#e3f5f6" $fg="#3b82f6">
            <IconUsers />
          </KpiIconWrap>
          <KpiText>
            <KpiValue>{stats.total}</KpiValue>
            <KpiLabel>{t('leads.totalLeads')}</KpiLabel>
          </KpiText>
        </KpiCard>
        <KpiCard>
          <KpiIconWrap $bg="#ebf3f4" $fg="#2563eb">
            <IconSparkle />
          </KpiIconWrap>
          <KpiText>
            <KpiValue>{stats.new}</KpiValue>
            <KpiLabel>{t('leads.newLeads')}</KpiLabel>
          </KpiText>
        </KpiCard>
        <KpiCard>
          <KpiIconWrap $bg="#f5f0eb" $fg="#f59e0b">
            <IconClock />
          </KpiIconWrap>
          <KpiText>
            <KpiValue>{stats.pending}</KpiValue>
            <KpiLabel>{t('leads.pending')}</KpiLabel>
          </KpiText>
        </KpiCard>
        <KpiCard>
          <KpiIconWrap $bg="#e0f2f1" $fg="#10b981">
            <IconCheckCircle />
          </KpiIconWrap>
          <KpiText>
            <KpiValue>{stats.contacted}</KpiValue>
            <KpiLabel>{t('leads.contacted')}</KpiLabel>
          </KpiText>
        </KpiCard>
      </KpiRow>

      {/* Profile Header Card */}
      <ProfileCard>
        <IconLeadScraper />
        <ProfileInfo>
          <ProfileTitle>{t('leads.totalInSystem', { count: stats.total })}</ProfileTitle>
        </ProfileInfo>
        <AddBtn onClick={() => setShowAdd(true)}>
          <IconPlus />
          {t('leads.addLead')}
        </AddBtn>
      </ProfileCard>

      {/* Tabs + Search + Table Card */}
      <div>
        <TabsRow>
          {TABS.map(tab => (
            <TabItem
              key={tab.key}
              $active={statusFilter === tab.key}
              onClick={() => handleTabClick(tab.key)}
            >
              {tab.label}
              <TabCount>
                {tab.key === ''
                  ? stats.total
                  : stats[tab.key as keyof typeof stats] ?? 0}
              </TabCount>
            </TabItem>
          ))}
        </TabsRow>

        <SearchBar>
          <SearchInput
            placeholder={t('leads.searchPlaceholder')}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </SearchBar>

        <Card style={{ borderRadius: '0 0 8px 8px' }}>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>{t('leads.status')}</th>
                  <th>{t('leads.name')} <IconSortArrow /></th>
                  <th>{t('leads.email')}</th>
                  <th>{t('leads.phone')}</th>
                  <th>{t('leads.industry')}</th>
                  <th>{t('leads.importedAt')}</th>
                  <th>{t('leads.action')}</th>
                </tr>
              </thead>
              <tbody>
                {error ? (
                  <tr>
                    <EmptyCell colSpan={8}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                        <strong style={{ color: '#c0392b' }}>{t('common.error')}</strong>
                        <span style={{ color: '#7f8c8d', fontSize: 13 }}>
                          {(error as any)?.message || String(error)}
                        </span>
                        <button
                          onClick={() => refetch()}
                          style={{
                            marginTop: 4,
                            padding: '6px 14px',
                            border: '1px solid #3b82f6',
                            background: '#3b82f6',
                            color: '#fff',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 13,
                          }}
                        >
                          {t('common.retry') || '重試'}
                        </button>
                      </div>
                    </EmptyCell>
                  </tr>
                ) : isLoading ? (
                  <tr><EmptyCell colSpan={8}>{t('leads.loading')}</EmptyCell></tr>
                ) : leads.length === 0 ? (
                  <tr><EmptyCell colSpan={8}>{t('leads.noLeads')}</EmptyCell></tr>
                ) : (
                  leads.map((lead, i) => {
                    const name = lead.company_name || 'Unknown';
                    const color = hashColor(name);
                    return (
                      <TRow key={lead._id} $even={i % 2 === 1} style={{ cursor: 'pointer' }} onClick={() => setSelectedLead(lead)}>
                        <td>
                          <StatusBadge $status={lead.status ?? 'new'}>{lead.status ?? 'new'}</StatusBadge>
                        </td>
                        <td>
                          <NameCell>
                            <Avatar $color={color}>{getInitials(name)}</Avatar>
                            <NameText>
                              <strong>{name}</strong>
                              {lead.website && <small>{lead.website}</small>}
                            </NameText>
                          </NameCell>
                        </td>
                        <td>{lead.email || '—'}</td>
                        <td>{lead.phone || '—'}</td>
                        <td>
                          <TagList>
                            {(lead.industry_tags ?? []).slice(0, 3).map(tag => (
                              <Tag key={tag}>{tag}</Tag>
                            ))}
                            {(!lead.industry_tags || lead.industry_tags.length === 0) && '—'}
                          </TagList>
                        </td>
                        <td>{lead._imported_at ? new Date(lead._imported_at).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'}</td>
                        <td>
                          {lead.status && lead.status !== 'contacted' && NEXT_STATUS[lead.status] && (
                            <ActionBtn
                              $color="#3b82f6"
                              title={STATUS_LABEL[lead.status]}
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(lead._id, NEXT_STATUS[lead.status!]); }}
                            >
                              <IconArrowRight />
                            </ActionBtn>
                          )}
                          <ActionBtn $color="#f59e0b" title="View" onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}>
                            <IconEye />
                          </ActionBtn>
                          <ActionBtn
                            $color="#ef4444"
                            title="Delete"
                            onClick={(e) => { e.stopPropagation(); handleDelete(lead._id); }}
                          >
                            <IconTrash />
                          </ActionBtn>
                        </td>
                      </TRow>
                    );
                  })
                )}
              </tbody>
            </Table>
          </TableWrap>
          {totalPages > 0 && (
            <PaginationRow>
              <span>{t('leads.showingOf', { count: leads.length, total })}</span>
              <PageBtns>
                <PageBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('common.prev')}</PageBtn>
                <PageBtn disabled>{page} / {totalPages}</PageBtn>
                <PageBtn disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t('common.next')}</PageBtn>
              </PageBtns>
            </PaginationRow>
          )}
        </Card>
      </div>

      {/* Add Lead Modal */}
      {showAdd && (
        <Overlay onClick={() => setShowAdd(false)}>
          <Modal onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <h2>{t('leads.addLead')}</h2>
              <CloseBtn onClick={() => setShowAdd(false)}>&times;</CloseBtn>
            </ModalHeader>
            <form onSubmit={handleCreate}>
              <ModalBody>
                <FormRow>
                  <FormGroup>
                    <Label>{t('leads.companyName')}</Label>
                    <Input
                      required
                      value={form.company_name}
                      onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                      placeholder={t('leads.enterCompanyName')}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>{t('leads.email')}</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder={t('leads.enterEmail')}
                    />
                  </FormGroup>
                </FormRow>
                <FormRow>
                  <FormGroup>
                    <Label>{t('leads.phone')}</Label>
                    <Input
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder={t('leads.enterPhone')}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>{t('leads.website')}</Label>
                    <Input
                      value={form.website}
                      onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                      placeholder={t('leads.enterWebsite')}
                    />
                  </FormGroup>
                </FormRow>
                <FormGroup>
                  <Label>{t('leads.address')}</Label>
                  <Input
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder={t('leads.enterAddress')}
                  />
                </FormGroup>
              </ModalBody>
              <ModalFooter>
                <SecondaryBtn type="button" onClick={() => setShowAdd(false)}>{t('common.close')}</SecondaryBtn>
                <PrimaryBtn type="submit" disabled={createLead.isPending}>
                  {createLead.isPending ? t('leads.creating') : t('common.submit')}
                </PrimaryBtn>
              </ModalFooter>
            </form>
          </Modal>
        </Overlay>
      )}

      {/* Lead Detail Panel */}
      {selectedLead && createPortal(
        <>
          <DpOverlay onClick={handleCloseDetail} />
          <DpPanel>
            <DpHeader>
              <Avatar $color={hashColor(selectedLead.company_name || 'Unknown')} style={{ width: 42, height: 42, fontSize: '0.875rem' }}>
                {getInitials(selectedLead.company_name || 'Unknown')}
              </Avatar>
              <DpHeaderInfo>
                <DpCompanyName>{selectedLead.company_name || 'Unknown'}</DpCompanyName>
                <StatusBadge $status={selectedLead.status ?? 'new'}>{selectedLead.status ?? 'new'}</StatusBadge>
              </DpHeaderInfo>
              <DpCloseBtn onClick={handleCloseDetail}>&times;</DpCloseBtn>
            </DpHeader>

            <DpBody>
              {/* Info Grid */}
              <DpGrid>
                <DpField>
                  <DpFieldLabel>Email</DpFieldLabel>
                  <DpFieldValue>{selectedLead.email || '—'}</DpFieldValue>
                </DpField>
                <DpField>
                  <DpFieldLabel>Phone</DpFieldLabel>
                  <DpFieldValue>{selectedLead.phone || '—'}</DpFieldValue>
                </DpField>
                <DpField>
                  <DpFieldLabel>Website</DpFieldLabel>
                  <DpFieldValue>{selectedLead.website || '—'}</DpFieldValue>
                </DpField>
                <DpField>
                  <DpFieldLabel>Address</DpFieldLabel>
                  <DpFieldValue>{selectedLead.address || '—'}</DpFieldValue>
                </DpField>
                <DpField>
                  <DpFieldLabel>Source</DpFieldLabel>
                  <DpFieldValue>{selectedLead.source || '—'}</DpFieldValue>
                </DpField>
                <DpField>
                  <DpFieldLabel>Rating</DpFieldLabel>
                  <DpFieldValue>{selectedLead.rating ? `${selectedLead.rating} / 5.0` : '—'}</DpFieldValue>
                </DpField>
                <DpField style={{ gridColumn: '1 / -1' }}>
                  <DpFieldLabel>Created</DpFieldLabel>
                  <DpFieldValue>{selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</DpFieldValue>
                </DpField>
              </DpGrid>

              {/* Industry Tags */}
              {selectedLead.industry_tags && selectedLead.industry_tags.length > 0 && (
                <>
                  <DpSectionTitle>Industry Tags</DpSectionTitle>
                  <DpTagList>
                    {selectedLead.industry_tags.map(tag => (
                      <DpTag key={tag}>{tag}</DpTag>
                    ))}
                  </DpTagList>
                </>
              )}

              {/* Timeline */}
              <DpSectionTitle>Lead Journey</DpSectionTitle>
              <DpTimeline>
                <DpTimelineItem $active>
                  Lead discovered via {selectedLead.source || 'unknown source'}
                </DpTimelineItem>
                <DpTimelineItem $active>
                  Added to pool
                </DpTimelineItem>
                <DpTimelineItem $active={selectedLead.status === 'pending' || selectedLead.status === 'contacted'}>
                  {selectedLead.status === 'new' ? 'Awaiting review' : 'Marked as pending'}
                </DpTimelineItem>
                {(selectedLead.status === 'contacted') && (
                  <DpTimelineItem $active>
                    Contacted
                  </DpTimelineItem>
                )}
              </DpTimeline>
            </DpBody>

            <DpFooter>
              {selectedLead.status && selectedLead.status !== 'contacted' && NEXT_STATUS[selectedLead.status] && (
                <DpActionBtn
                  $variant="primary"
                  onClick={() => {
                    handleStatusChange(selectedLead._id, NEXT_STATUS[selectedLead.status!]);
                    handleCloseDetail();
                  }}
                >
                  推進狀態
                </DpActionBtn>
              )}
              <DpActionBtn
                $variant="danger"
                onClick={() => {
                  handleDelete(selectedLead._id);
                  handleCloseDetail();
                }}
              >
                刪除
              </DpActionBtn>
            </DpFooter>
          </DpPanel>
        </>,
        document.body
      )}

      {/* Footer */}
      <Footer>
        <span>{t('footer.copyrightHermes', { year: 2024 })}</span>
        <div>
          <a href="#">{t('footer.documentation')}</a>
          <a href="#">{t('footer.support')}</a>
          <a href="#">{t('footer.faqs')}</a>
        </div>
      </Footer>
    </Page>
  );
};

export default Leads;
