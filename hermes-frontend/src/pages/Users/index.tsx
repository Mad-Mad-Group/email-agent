import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes, useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { media } from '../../styles/media';
import { glassSurface } from '../../styles/glassSurface';
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
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: ${({ theme }) => theme.radii.card}px;
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
  ${glassSurface}
  border-radius: ${({ theme }) => theme.radii.card}px;
`;

const CardBody = styled.div`padding: ${({ theme }) => theme.spacing.md}px;`;

/* ── Profile Header Card ── */

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing.md}px;
  ${media.mobile} { grid-template-columns: repeat(2, 1fr); }
`;

const StatCard2 = styled.div<{ $color: string }>`
  ${glassSurface}
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
  color: ${({ $active, $color, theme }) => $active ? ($color || theme.colors.accent) : theme.colors.textTertiary};
  border-bottom: 2px solid ${({ $active, $color, theme }) => $active ? ($color || theme.colors.accent) : 'transparent'};
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
    ? theme.colors.accent
    : theme.colors.surfaceMuted};
  color: ${({ $active, theme }) => $active ? theme.colors.textInverted : theme.colors.textTertiary};
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
  &:hover { background: ${({ theme }) => theme.colors.surfaceMuted}; }
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

/* ROLE_COLORS is now built inside the component via useTheme() */

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
    <circle cx="60" cy="30" r="16" fill="#EFEAE3" stroke="#9E9E9E" strokeWidth="1.5"/>
    <circle cx="60" cy="26" r="6" fill="#9E9E9E" opacity="0.7"/>
    <path d="M48 42c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#9E9E9E" strokeWidth="1.5" fill="#EFEAE3"/>
    <circle cx="32" cy="38" r="10" fill="#F5F2ED" stroke="#EFEAE3" strokeWidth="1"/>
    <circle cx="32" cy="35" r="4" fill="#EFEAE3" opacity="0.6"/>
    <path d="M24 46c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="#EFEAE3" strokeWidth="1" fill="#F5F2ED"/>
    <circle cx="88" cy="38" r="10" fill="#F5F2ED" stroke="#EFEAE3" strokeWidth="1"/>
    <circle cx="88" cy="35" r="4" fill="#EFEAE3" opacity="0.6"/>
    <path d="M80 46c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="#EFEAE3" strokeWidth="1" fill="#F5F2ED"/>
    <text x="60" y="72" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fill="#9E9E9E">Team</text>
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
  ${glassSurface}
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1201;
  width: 500px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 14px;
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
  color: ${({ theme }) => theme.colors.accent};
  flex-shrink: 0;
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => `${theme.colors.accent}15`};
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
  background: ${({ $active, theme }) => $active ? `${theme.colors.accent}18` : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.accent : theme.colors.textTertiary};
  border: 1px solid ${({ $active, theme }) => $active ? `${theme.colors.accent}40` : theme.colors.border};
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
    $variant === 'danger' ? theme.strong.mauve :
    $variant === 'primary' ? theme.colors.accent : theme.colors.surfaceMuted};
  color: ${({ $variant, theme }) =>
    $variant === 'danger' ? theme.colors.textInverted :
    $variant === 'primary' ? theme.colors.textInverted : 'inherit'};
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
  &:focus { border-color: ${({ theme }) => theme.colors.accent}; }
`;

const DpSelect = styled.select`
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.canvas};
  outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.accent}; }
`;

/* ── Helpers ── */

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    const locale = ({ en: 'en-US', 'zh-TW': 'zh-HK', 'zh-CN': 'zh-CN' } as Record<string,string>)[i18n.language] || 'en-US';
    return new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

/* roleProps is now built inside the component via useTheme() */

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
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { data, isLoading } = useUsers();
  const users: UserItem[] = (data as any)?.users ?? (Array.isArray(data) ? data : []);

  const ROLE_COLORS: Record<string, { bg: string; fg: string; avatar: string }> = {
    admin:   { bg: `${theme.colors.accent}18`, fg: theme.colors.accent, avatar: theme.colors.surfaceMuted },
    manager: { bg: `${theme.strong.gold}18`, fg: theme.strong.gold, avatar: theme.colors.surfaceMuted },
    user:    { bg: `${theme.colors.accent}18`, fg: theme.colors.accent, avatar: theme.colors.surfaceMuted },
  };

  const roleProps = (role: string) => {
    const lower = role.toLowerCase();
    return ROLE_COLORS[lower] ?? { bg: `${theme.colors.textTertiary}18`, fg: theme.colors.textTertiary, avatar: theme.colors.surfaceMuted };
  };

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
    { key: 'all' as RoleFilter, label: t('users.allUsers'), color: theme.colors.accent },
    { key: 'admin' as RoleFilter, label: t('users.admins'), color: theme.colors.accent },
    { key: 'manager' as RoleFilter, label: t('users.managers'), color: theme.strong.gold },
    { key: 'user' as RoleFilter, label: t('users.users'), color: theme.strong.olive },
  ], [t, theme]);

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
        <StatCard2 $color={theme.colors.accent}>
          <StatCardIcon $color={theme.colors.accent}><TabIconAll /></StatCardIcon>
          <StatCardInfo>
            <StatCardValue $color={theme.colors.accent}>{roleCounts.all}</StatCardValue>
            <StatCardLabel>{t('users.allUsers')}</StatCardLabel>
          </StatCardInfo>
        </StatCard2>
        <StatCard2 $color={theme.colors.accent}>
          <StatCardIcon $color={theme.colors.accent}><TabIconAdmin /></StatCardIcon>
          <StatCardInfo>
            <StatCardValue $color={theme.colors.accent}>{roleCounts.admin}</StatCardValue>
            <StatCardLabel>{t('users.admins')}</StatCardLabel>
          </StatCardInfo>
        </StatCard2>
        <StatCard2 $color={theme.strong.gold}>
          <StatCardIcon $color={theme.strong.gold}><TabIconManager /></StatCardIcon>
          <StatCardInfo>
            <StatCardValue $color={theme.strong.gold}>{roleCounts.manager}</StatCardValue>
            <StatCardLabel>{t('users.managers')}</StatCardLabel>
          </StatCardInfo>
        </StatCard2>
        <StatCard2 $color={theme.strong.olive}>
          <StatCardIcon $color={theme.strong.olive}><TabIconUser /></StatCardIcon>
          <StatCardInfo>
            <StatCardValue $color={theme.strong.olive}>{roleCounts.user}</StatCardValue>
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
                  <tr><EmptyCell colSpan={5}><div><EmptyTeamIllustration />{t('users.noUsers')}<EmptyHint>{t('users.inviteHint')}</EmptyHint></div></EmptyCell></tr>
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
                    <DpFieldLabel>{t('users.name')}</DpFieldLabel>
                    <DpInput value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  </DpField>
                  <DpField>
                    <DpFieldLabel>{t('users.email')}</DpFieldLabel>
                    <DpInput value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                  </DpField>
                  <DpField>
                    <DpFieldLabel>{t('users.role')}</DpFieldLabel>
                    <DpSelect value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="staff">{t('users.roleStaff')}</option>
                      <option value="admin">{t('users.roleAdmin')}</option>
                      <option value="super_admin">{t('users.roleSuperAdmin')}</option>
                    </DpSelect>
                  </DpField>
                </DpGrid>
              ) : (
                <>
                  {/* ── View Mode ── */}
                  <DpGrid>
                    <DpField>
                      <DpFieldLabel>{t('users.email')}</DpFieldLabel>
                      <DpFieldValue>{selectedUser.email}</DpFieldValue>
                    </DpField>
                    <DpField>
                      <DpFieldLabel>{t('users.role')}</DpFieldLabel>
                      <DpFieldValue style={{ textTransform: 'capitalize' }}>{selectedUser.role}</DpFieldValue>
                    </DpField>
                    <DpField>
                      <DpFieldLabel>{t('users.joinDate')}</DpFieldLabel>
                      <DpFieldValue>{formatDate(selectedUser.createdAt)}</DpFieldValue>
                    </DpField>
                  </DpGrid>

                  {/* Permissions Section */}
                  {(selectedUser.permissions ?? []).length > 0 && (
                    <div>
                      <DpSectionTitle>{t('users.permissions')}</DpSectionTitle>
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
                {t('users.memberSince', { date: formatDate(selectedUser.createdAt) })}
              </DpFooterStatus>
              {editing ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <DpActionBtn onClick={() => setEditing(false)}>{t('common.cancel')}</DpActionBtn>
                  <DpActionBtn $variant="primary" onClick={handleSaveEdit} disabled={updateUser.isPending}>
                    {updateUser.isPending ? t('users.saving') : t('common.save')}
                  </DpActionBtn>
                </div>
              ) : (
                <DpActionBtn $variant="primary" onClick={handleStartEdit}>{t('common.edit')}</DpActionBtn>
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
