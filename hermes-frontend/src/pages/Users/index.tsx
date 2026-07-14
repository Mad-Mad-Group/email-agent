import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { media } from '../../styles/media';
import { useUsers } from '../../api/hooks';
import { UserItem, usersApi } from '../../api/services';

/* ══════════════════════════════════════
   CMS Users — LUNO Contacts-style UI
   ══════════════════════════════════════ */

/* ── Inline SVG icons (16x16 viewBox) ── */

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 1c-3.31 0-6 1.79-6 4v1h12v-1c0-2.21-2.69-4-6-4z" fill="currentColor"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1L2 3.5v4c0 3.5 2.56 6.37 6 7 3.44-.63 6-3.5 6-7v-4L8 1zm0 7.99h4.5c-.33 2.65-2.18 4.93-4.5 5.49V9H3.5V4.35L8 2.57v6.42z" fill="currentColor"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2h-.5V1h-1v1h-5V1h-1v1H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V3a1 1 0 00-1-1zm0 11H4V5.5h8V13z" fill="currentColor"/>
  </svg>
);

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 3H3a1 1 0 00-1 1v8a1 1 0 001 1h10a1 1 0 001-1V4a1 1 0 00-1-1zm0 2l-5 3.13L3 5V4l5 3.13L13 4v1z" fill="currentColor"/>
  </svg>
);

const TeamIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.5 8a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm5 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm-5 1C3.67 9 0 9.92 0 11.75V13h11v-1.25C11 9.92 7.33 9 5.5 9zm5 0c-.23 0-.49.01-.77.04C11.07 10.01 12 11.13 12 11.75V13h4v-1.25C16 9.92 12.33 9 10.5 9z" fill="currentColor"/>
  </svg>
);

/* ── Layout primitives ── */

const Page = styled.div`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing.md}px;`;

const PageCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: 24px;
  display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing.md}px;
`;

const Breadcrumb = styled.ol`
  list-style: none; margin: 0; padding: 0; display: flex; gap: ${({ theme }) => theme.spacing.sm}px;
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary};
  li + li::before { content: '/'; margin-right: ${({ theme }) => theme.spacing.sm}px; }
  a { color: ${({ theme }) => theme.colors.textSecondary}; text-decoration: none; &:hover { text-decoration: underline; } }
`;

const ToolbarRow = styled.div`
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
`;

const PageTitle = styled.h1`font-size: 1.25rem; font-weight: 700; margin: 0; color: ${({ theme }) => theme.colors.textPrimary};`;
const PageSub = styled.p`font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary}; margin: 2px 0 0;`;

const StatsRow = styled.div`
  display: flex; gap: ${({ theme }) => theme.spacing.lg}px;
  ${media.mobile} { flex-wrap: wrap; gap: 12px; }
`;

const StatItem = styled.div`text-align: right;`;

const StatValue = styled.div`font-size: 1rem; font-weight: 600; color: ${({ theme }) => theme.colors.textPrimary};`;

const StatLabel = styled.div`
  font-size: 0.6875rem; text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

/* ── Card ── */

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const CardBody = styled.div`padding: ${({ theme }) => theme.spacing.md}px;`;

/* ── Profile Header Card ── */

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing.md}px;
  ${media.mobile} { grid-template-columns: repeat(2, 1fr); }
`;

const StatCard2 = styled.div<{ $color: string; $bg1?: string; $bg2?: string }>`
  background: ${({ theme, $bg1, $bg2 }) =>
    theme.mode === 'dark'
      ? theme.colors.surface
      : `linear-gradient(135deg, ${$bg1 || '#f0fdf4'}, ${$bg2 || '#dcfce7'})`};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card}px;
  border-left: 4px solid ${({ $color }) => $color};
  padding: 20px;
  display: flex; align-items: center; gap: 14px;
  position: relative;
  overflow: hidden;
  transition: transform 0.18s, box-shadow 0.18s;
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.10); }
`;

const StatCardIcon = styled.div<{ $color: string }>`
  width: 42px; height: 42px;
  border-radius: 10px;
  background: ${({ $color }) => $color}12;
  color: ${({ $color }) => $color};
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  svg { width: 20px; height: 20px; }
`;

const StatCardInfo = styled.div`
  flex: 1;
`;

const StatCardValue = styled.div<{ $color: string }>`
  font-size: 2rem; font-weight: 800;
  color: ${({ $color }) => $color};
  line-height: 1;
`;

const StatCardLabel = styled.div`
  font-size: 0.6875rem; font-weight: 700;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

/* ── Tabs ── */

const TabBar = styled.div`
  display: flex; gap: 0; overflow-x: auto;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  ${media.mobile} { gap: 0; }
`;

const Tab = styled.button<{ $active?: boolean; $color?: string }>`
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 24px;
  border: none;
  background: transparent;
  font-size: 0.8125rem; font-weight: 600; cursor: pointer;
  color: ${({ $active, $color, theme }) => $active ? ($color || theme.colors.blue) : theme.colors.textTertiary};
  border-bottom: 2px solid ${({ $active, $color, theme }) => $active ? ($color || theme.colors.blue) : 'transparent'};
  margin-bottom: -1px; white-space: nowrap;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  &:hover { color: ${({ theme }) => theme.colors.textPrimary}; background: rgba(0,0,0,0.02); }
  svg { flex-shrink: 0; opacity: ${({ $active }) => $active ? 0.7 : 0.35}; }
`;

const TabCount = styled.span<{ $active?: boolean }>`
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 18px; padding: 0 5px;
  border-radius: 9px; margin-left: 6px;
  font-size: 0.625rem; font-weight: 600;
  background: ${({ $active, theme }) => $active
    ? theme.colors.blue
    : theme.colors.surfaceMuted};
  color: ${({ $active, theme }) => $active ? '#fff' : theme.colors.textTertiary};
`;

/* ── Table ── */

const TableWrap = styled.div`overflow-x: auto;`;

const Table = styled.table`
  width: 100%; border-collapse: collapse; font-size: 0.8125rem;
  min-width: 700px;
  th, td {
    padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
    text-align: left; white-space: nowrap;
  }
  th {
    font-weight: 600; text-transform: uppercase; font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.textTertiary};
    background: ${({ theme }) => theme.colors.canvas};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
  ${media.mobile} {
    min-width: 480px;
    font-size: 0.75rem;
    th, td { padding: ${({ theme }) => theme.spacing.xs}px ${({ theme }) => theme.spacing.sm}px; }
    th { font-size: 0.625rem; }
  }
`;

const TRow = styled.tr<{ $even?: boolean }>`
  background: ${({ $even, theme }) => $even
    ? theme.colors.surfaceMuted
    : theme.colors.surface};
  transition: background 0.15s;
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#ecfeff'};
  }
  td { border-bottom: 1px solid ${({ theme }) => theme.colors.border}; }
  cursor: pointer;
`;

const NameCell = styled.div`
  display: flex; align-items: center; gap: ${({ theme }) => theme.spacing.sm}px;
`;

const AvatarCircle = styled.div<{ $bg: string }>`
  width: 36px; height: 36px; border-radius: 50%;
  background: ${({ $bg }) => $bg};
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8125rem; font-weight: 600; color: ${({ theme }) => theme.colors.textPrimary};
  flex-shrink: 0;
  box-shadow: none;
`;

const UserName = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary}; font-weight: 500;
`;

/* ── Role badge ── */

const ROLE_COLORS: Record<string, { bg: string; fg: string; avatar: string }> = {
  admin:   { bg: '#0369a118', fg: '#0369a1', avatar: '#a7f3d0' },
  manager: { bg: '#d9770618', fg: '#d97706', avatar: '#c4b5fd' },
  user:    { bg: '#0ea5e918', fg: '#0ea5e9', avatar: '#a7f3d0' },
};

const RoleBadge = styled.span<{ $bg: string; $fg: string }>`
  display: inline-block; padding: 2px 10px; border-radius: 99px;
  font-size: 0.6875rem; font-weight: 600;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
  text-transform: capitalize;
  border: 1px solid ${({ $bg }) => $bg}55;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
`;

/* ── Permissions ── */

const PermList = styled.div`display: flex; gap: 4px; flex-wrap: wrap;`;

const PermTag = styled.span`
  display: inline-block; padding: 2px 8px; border-radius: 12px;
  font-size: 0.6875rem;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const PermCount = styled.span`
  display: inline-block; padding: 2px 8px; border-radius: 12px;
  font-size: 0.6875rem;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const EmptyCell = styled.td`
  text-align: center; padding: 40px ${({ theme }) => theme.spacing.md}px;
  color: ${({ theme }) => theme.colors.textTertiary}; font-size: 0.875rem;
  & > div { display: flex; flex-direction: column; align-items: center; gap: 12px; }
`;

const EmptyTeamIllustration = () => (
  <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="30" r="16" fill="#e0f2fe" stroke="#93c5fd" strokeWidth="1.5"/>
    <circle cx="60" cy="26" r="6" fill="#93c5fd" opacity="0.7"/>
    <path d="M48 42c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#93c5fd" strokeWidth="1.5" fill="#e0f2fe"/>
    <circle cx="32" cy="38" r="10" fill="#f0f9ff" stroke="#bfdbfe" strokeWidth="1"/>
    <circle cx="32" cy="35" r="4" fill="#bfdbfe" opacity="0.6"/>
    <path d="M24 46c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="#bfdbfe" strokeWidth="1" fill="#f0f9ff"/>
    <circle cx="88" cy="38" r="10" fill="#f0f9ff" stroke="#bfdbfe" strokeWidth="1"/>
    <circle cx="88" cy="35" r="4" fill="#bfdbfe" opacity="0.6"/>
    <path d="M80 46c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="#bfdbfe" strokeWidth="1" fill="#f0f9ff"/>
    <text x="60" y="72" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fill="#94a3b8">Team</text>
  </svg>
);

const EmptyHint = styled.p`
  margin: 0; font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary}; opacity: 0.8;
`;

/* ── Footer ── */

const Footer = styled.footer`
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.md}px 0;
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textTertiary};
  a { color: ${({ theme }) => theme.colors.textSecondary}; text-decoration: none; margin-left: ${({ theme }) => theme.spacing.md}px; }
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
  width: 500px;
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

const DpUserName = styled.h2`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const DpCloseBtn = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.blue};
  flex-shrink: 0;
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.08)'};
  }
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


const DpPermGrid = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const DpPermBadge = styled.span<{ $active?: boolean }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${({ $active, theme }) => $active ? `${theme.colors.blue}18` : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.blue : theme.colors.textTertiary};
  border: 1px solid ${({ $active, theme }) => $active ? `${theme.colors.blue}40` : theme.colors.border};
`;

const DpFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const DpFooterStatus = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
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
    $variant === 'danger' ? theme.colors.red :
    $variant === 'primary' ? theme.colors.blue : theme.colors.surfaceMuted};
  color: ${({ $variant }) =>
    $variant === 'danger' ? '#fff' :
    $variant === 'primary' ? '#fff' : 'inherit'};
  &:hover { opacity: 0.85; }
`;

/* ── Edit form input ── */

const DpInput = styled.input`
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.canvas};
  outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.blue}; }
`;

const DpSelect = styled.select`
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.canvas};
  outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.blue}; }
`;

/* ── Helpers ── */

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

function roleProps(role: string) {
  const lower = role.toLowerCase();
  return ROLE_COLORS[lower] ?? { bg: '#0a140d18', fg: '#0a140d', avatar: '#bbf7d0' };
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/* ── Tab Icons ── */

const TabIconAll = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const TabIconAdmin = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const TabIconManager = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const TabIconUser = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const TAB_ICONS: Record<string, React.FC> = {
  all: TabIconAll,
  admin: TabIconAdmin,
  manager: TabIconManager,
  user: TabIconUser,
};

/* ── Tab definitions ── */

type RoleFilter = 'all' | 'admin' | 'manager' | 'user';

/* ── Component ── */

const Users: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useUsers();
  const users: UserItem[] = (data as any)?.users ?? (Array.isArray(data) ? data : []);

  const [activeTab, setActiveTab] = useState<RoleFilter>('all');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' });

  const updateUser = useMutation({
    mutationFn: ({ id, data: d }: { id: string; data: Record<string, unknown> }) => usersApi.update(id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditing(false);
      setSelectedUser(null);
    },
  });

  const handleCloseDetail = useCallback(() => { setSelectedUser(null); setEditing(false); }, []);
  const handleStartEdit = useCallback(() => {
    if (!selectedUser) return;
    setEditForm({ name: selectedUser.name, email: selectedUser.email, role: selectedUser.role });
    setEditing(true);
  }, [selectedUser]);
  const handleSaveEdit = useCallback(() => {
    if (!selectedUser) return;
    updateUser.mutate({ id: selectedUser._id, data: editForm });
  }, [selectedUser, editForm, updateUser]);

  const translatedTabs = useMemo(() => [
    { key: 'all' as RoleFilter, label: t('users.allUsers'), color: '#0ea5e9' },
    { key: 'admin' as RoleFilter, label: t('users.admins'), color: '#0369a1' },
    { key: 'manager' as RoleFilter, label: t('users.managers'), color: '#d97706' },
    { key: 'user' as RoleFilter, label: t('users.users'), color: '#22c55e' },
  ], [t]);

  /* Filtered list based on active tab */
  const filtered = useMemo(() => {
    if (activeTab === 'all') return users;
    return users.filter(u => u.role.toLowerCase() === activeTab);
  }, [users, activeTab]);

  /* Stats per role */
  const roleCounts = useMemo(() => ({
    all: users.length,
    admin: users.filter(u => u.role.toLowerCase() === 'admin').length,
    manager: users.filter(u => u.role.toLowerCase() === 'manager').length,
    user: users.filter(u => u.role.toLowerCase() === 'user').length,
  }), [users]);

  return (
    <Page>
      <PageCard>
      <div><PageTitle>{t('users.title')}</PageTitle><PageSub>{t('users.subtitle')}</PageSub></div>
      <StatsGrid>
        <StatCard2 $color="#0ea5e9" $bg1="#ecfeff" $bg2="#cffafe">
          <StatCardIcon $color="#0ea5e9"><TabIconAll /></StatCardIcon>
          <StatCardInfo>
            <StatCardValue $color="#0ea5e9">{roleCounts.all}</StatCardValue>
            <StatCardLabel>{t('users.allUsers')}</StatCardLabel>
          </StatCardInfo>
        </StatCard2>
        <StatCard2 $color="#0369a1" $bg1="#f0fdf4" $bg2="#dcfce7">
          <StatCardIcon $color="#0369a1"><TabIconAdmin /></StatCardIcon>
          <StatCardInfo>
            <StatCardValue $color="#0369a1">{roleCounts.admin}</StatCardValue>
            <StatCardLabel>{t('users.admins')}</StatCardLabel>
          </StatCardInfo>
        </StatCard2>
        <StatCard2 $color="#d97706" $bg1="#fffbeb" $bg2="#fef3c7">
          <StatCardIcon $color="#d97706"><TabIconManager /></StatCardIcon>
          <StatCardInfo>
            <StatCardValue $color="#d97706">{roleCounts.manager}</StatCardValue>
            <StatCardLabel>{t('users.managers')}</StatCardLabel>
          </StatCardInfo>
        </StatCard2>
        <StatCard2 $color="#22c55e" $bg1="#faf5ff" $bg2="#ede9fe">
          <StatCardIcon $color="#22c55e"><TabIconUser /></StatCardIcon>
          <StatCardInfo>
            <StatCardValue $color="#22c55e">{roleCounts.user}</StatCardValue>
            <StatCardLabel>{t('users.users')}</StatCardLabel>
          </StatCardInfo>
        </StatCard2>
      </StatsGrid>

        {/* Tabs */}
        <TabBar>
          {translatedTabs.map(tab => (
            <Tab
              key={tab.key}
              $active={activeTab === tab.key}
              $color={tab.color}
              onClick={() => setActiveTab(tab.key)}
            >
              {(() => { const Icon = TAB_ICONS[tab.key]; return Icon ? <Icon /> : null; })()}
              {tab.label}
              <TabCount $active={activeTab === tab.key}>{roleCounts[tab.key]}</TabCount>
            </Tab>
          ))}
        </TabBar>

        {/* User Table */}
        <CardBody>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>{t('users.name')}</th>
                  <th>{t('users.email')}</th>
                  <th>{t('users.role')}</th>
                  <th>{t('users.permissions')}</th>
                  <th>{t('users.created')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><EmptyCell colSpan={5}>{t('users.loading')}</EmptyCell></tr>
                ) : filtered.length === 0 ? (
                  <tr><EmptyCell colSpan={5}><div><EmptyTeamIllustration />{t('users.noUsers')}<EmptyHint>邀請成員加入你的團隊。</EmptyHint></div></EmptyCell></tr>
                ) : (
                  filtered.map((u, i) => {
                    const { bg, fg, avatar } = roleProps(u.role);
                    const perms = u.permissions ?? [];
                    return (
                      <TRow key={u._id} $even={i % 2 === 1} onClick={() => setSelectedUser(u)}>
                        <td>
                          <NameCell>
                            <AvatarCircle $bg={avatar}>
                              {getInitials(u.name)}
                            </AvatarCircle>
                            <UserName>{u.name}</UserName>
                          </NameCell>
                        </td>
                        <td>{u.email}</td>
                        <td><RoleBadge $bg={bg} $fg={fg}>{u.role}</RoleBadge></td>
                        <td>
                          {perms.length === 0 ? (
                            <PermCount>{t('users.noPermissions')}</PermCount>
                          ) : (
                            <PermList>
                              {perms.slice(0, 2).map(p => (
                                <PermTag key={p}>{p}</PermTag>
                              ))}
                              {perms.length > 2 && (
                                <PermCount>{t('users.morePerms', { count: perms.length - 2 })}</PermCount>
                              )}
                            </PermList>
                          )}
                        </td>
                        <td>{formatDate(u.createdAt)}</td>
                      </TRow>
                    );
                  })
                )}
              </tbody>
            </Table>
          </TableWrap>
        </CardBody>
      </PageCard>

      {/* Footer */}
      <Footer>
        <span>{t('footer.copyrightHermes', { year: 2026 })}</span>
        <div>
          <a href="#">{t('footer.documentation')}</a>
          <a href="#">{t('footer.support')}</a>
          <a href="#">{t('footer.faqs')}</a>
        </div>
      </Footer>

      {/* Detail Panel */}
      {selectedUser && createPortal(
        <>
          <DpOverlay onClick={handleCloseDetail} />
          <DpPanel>
            <DpHeader>
              <AvatarCircle $bg={roleProps(selectedUser.role).avatar} style={{ width: 42, height: 42, fontSize: '0.875rem' }}>
                {getInitials(selectedUser.name)}
              </AvatarCircle>
              <DpHeaderInfo>
                <DpUserName>{selectedUser.name}</DpUserName>
                <RoleBadge $bg={roleProps(selectedUser.role).bg} $fg={roleProps(selectedUser.role).fg}>
                  {selectedUser.role}
                </RoleBadge>
              </DpHeaderInfo>
              <DpCloseBtn onClick={handleCloseDetail}><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></DpCloseBtn>
            </DpHeader>

            <DpBody>
              {editing ? (
                /* ── Edit Mode ── */
                <DpGrid>
                  <DpField>
                    <DpFieldLabel>Name</DpFieldLabel>
                    <DpInput value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  </DpField>
                  <DpField>
                    <DpFieldLabel>Email</DpFieldLabel>
                    <DpInput value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                  </DpField>
                  <DpField>
                    <DpFieldLabel>Role</DpFieldLabel>
                    <DpSelect value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </DpSelect>
                  </DpField>
                </DpGrid>
              ) : (
                <>
                  {/* ── View Mode ── */}
                  <DpGrid>
                    <DpField>
                      <DpFieldLabel>Email</DpFieldLabel>
                      <DpFieldValue>{selectedUser.email}</DpFieldValue>
                    </DpField>
                    <DpField>
                      <DpFieldLabel>Role</DpFieldLabel>
                      <DpFieldValue style={{ textTransform: 'capitalize' }}>{selectedUser.role}</DpFieldValue>
                    </DpField>
                    <DpField>
                      <DpFieldLabel>Join Date</DpFieldLabel>
                      <DpFieldValue>{formatDate(selectedUser.createdAt)}</DpFieldValue>
                    </DpField>
                  </DpGrid>

                  {/* Permissions Section */}
                  {(selectedUser.permissions ?? []).length > 0 && (
                    <div>
                      <DpSectionTitle>Permissions</DpSectionTitle>
                      <DpPermGrid style={{ marginTop: 10 }}>
                        {(selectedUser.permissions ?? []).map(perm => (
                          <DpPermBadge key={perm} $active>{perm}</DpPermBadge>
                        ))}
                      </DpPermGrid>
                    </div>
                  )}
                </>
              )}
            </DpBody>

            <DpFooter>
              <DpFooterStatus>
                Member since {formatDate(selectedUser.createdAt)}
              </DpFooterStatus>
              {editing ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <DpActionBtn onClick={() => setEditing(false)}>取消</DpActionBtn>
                  <DpActionBtn $variant="primary" onClick={handleSaveEdit} disabled={updateUser.isPending}>
                    {updateUser.isPending ? '儲存中...' : '儲存'}
                  </DpActionBtn>
                </div>
              ) : (
                <DpActionBtn $variant="primary" onClick={handleStartEdit}>編輯</DpActionBtn>
              )}
            </DpFooter>
          </DpPanel>
        </>,
        document.body
      )}
    </Page>
  );
};

export default Users;
