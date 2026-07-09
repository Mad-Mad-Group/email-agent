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

const Breadcrumb = styled.ol`
  list-style: none; margin: 0; padding: 0; display: flex; gap: ${({ theme }) => theme.spacing.sm}px;
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary};
  li + li::before { content: '/'; margin-right: ${({ theme }) => theme.spacing.sm}px; }
  a { color: ${({ theme }) => theme.colors.textSecondary}; text-decoration: none; &:hover { text-decoration: underline; } }
`;

const ToolbarRow = styled.div`
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
`;

const PageTitle = styled.h1`
  font-size: 1.15rem; font-weight: 600; margin: 4px 0 0;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const PageSub = styled.small`
  color: ${({ theme }) => theme.colors.textTertiary}; font-size: 0.8125rem;
`;

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

const ProfileHeader = styled.div`
  display: flex; align-items: center; gap: ${({ theme }) => theme.spacing.md}px;
  padding: ${({ theme }) => theme.spacing.lg}px ${({ theme }) => theme.spacing.md}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  ${media.mobile} { flex-direction: column; align-items: flex-start; }
`;

const ProfileIcon = styled.div`
  width: 56px; height: 56px; border-radius: 50%;
  background: ${({ theme }) => theme.colors.blue};
  display: flex; align-items: center; justify-content: center;
  color: #fff; flex-shrink: 0;
  svg { width: 28px; height: 28px; }
`;

const ProfileInfo = styled.div`
  flex: 1;
  h2 { margin: 0; font-size: 1.05rem; font-weight: 600; color: ${({ theme }) => theme.colors.textPrimary}; }
  p { margin: 4px 0 0; font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary}; }
`;

/* ── Tabs ── */

const TabBar = styled.div`
  display: flex; gap: 0; overflow-x: auto;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  ${media.mobile} { gap: 0; }
`;

const Tab = styled.button<{ $active?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border: none;
  background: ${({ $active }) => $active
    ? 'transparent'
    : 'transparent'};
  font-size: 0.8125rem; font-weight: 600; cursor: pointer;
  color: ${({ $active, theme }) => $active ? theme.colors.blue : theme.colors.textTertiary};
  border-bottom: 2px solid ${({ $active, theme }) => $active ? theme.colors.blue : 'transparent'};
  margin-bottom: -1px; white-space: nowrap;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  &:hover { color: ${({ theme }) => theme.colors.textPrimary}; }
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
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#eff6ff'};
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
  admin:   { bg: '#1d4ed818', fg: '#1d4ed8', avatar: '#bfdbfe' },
  manager: { bg: '#d9770618', fg: '#d97706', avatar: '#c4b5fd' },
  user:    { bg: '#3b82f618', fg: '#3b82f6', avatar: '#a5f3fc' },
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
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)'};
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
  return ROLE_COLORS[lower] ?? { bg: '#0f172a18', fg: '#0f172a', avatar: '#bbf7d0' };
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/* ── Tab definitions ── */

type RoleFilter = 'all' | 'admin' | 'manager' | 'user';

const TABS: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'All Users' },
  { key: 'admin', label: 'Admins' },
  { key: 'manager', label: 'Managers' },
  { key: 'user', label: 'Users' },
];

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
    { key: 'all' as RoleFilter, label: t('users.allUsers') },
    { key: 'admin' as RoleFilter, label: t('users.admins') },
    { key: 'manager' as RoleFilter, label: t('users.managers') },
    { key: 'user' as RoleFilter, label: t('users.users') },
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
      {/* Profile Header Card (Luno Contacts style) */}
      <Card>
        <ProfileHeader>
          <ProfileIcon><TeamIcon /></ProfileIcon>
          <ProfileInfo>
            <h2>{t('users.teamOverview')}</h2>
            <p>{t('users.membersSummary', { count: users.length, admin: roleCounts.admin, manager: roleCounts.manager, user: roleCounts.user })}</p>
          </ProfileInfo>
        </ProfileHeader>

        {/* Tabs */}
        <TabBar>
          {translatedTabs.map(tab => (
            <Tab
              key={tab.key}
              $active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              <TabCount>{roleCounts[tab.key]}</TabCount>
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
                  <tr><EmptyCell colSpan={5}>{t('users.noUsers')}</EmptyCell></tr>
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
      </Card>

      {/* Footer */}
      <Footer>
        <span>{t('footer.copyrightHermes', { year: 2024 })}</span>
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
