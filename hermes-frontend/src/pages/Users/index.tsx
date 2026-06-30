import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { media } from '../../styles/media';
import { useUsers } from '../../api/hooks';
import { UserItem } from '../../api/services';

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
  background: #ffffff;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: 0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04);
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
  background: linear-gradient(135deg, #6890c2 0%, #567ebb 100%);
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
  color: ${({ $active, theme }) => $active ? '#567ebb' : theme.colors.textTertiary};
  border-bottom: 2px solid ${({ $active }) => $active ? '#567ebb' : 'transparent'};
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
    ? 'linear-gradient(135deg, #6890c2 0%, #567ebb 100%)'
    : theme.colors.surfaceMuted};
  color: ${({ $active }) => $active ? '#fff' : theme.colors.textTertiary};
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
    background: #f9fafb;
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
    ? '#f9fafb'
    : theme.colors.surface};
  transition: background 0.15s;
  &:hover {
    background: #f0f7ff;
  }
  td { border-bottom: 1px solid ${({ theme }) => theme.colors.border}; }
  cursor: pointer;
`;

const NameCell = styled.div`
  display: flex; align-items: center; gap: ${({ theme }) => theme.spacing.sm}px;
`;

const AvatarCircle = styled.div<{ $bg: string }>`
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, ${({ $bg }) => $bg} 0%, ${({ $bg }) => $bg}cc 100%);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8125rem; font-weight: 600; color: #fff;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2);
  border: 1.5px solid rgba(255,255,255,0.5);
`;

const UserName = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary}; font-weight: 500;
`;

/* ── Role badge ── */

const ROLE_COLORS: Record<string, { bg: string; fg: string; avatar: string }> = {
  admin:   { bg: '#4367a318', fg: '#4367a3', avatar: '#4367a3' },
  manager: { bg: '#c1986218', fg: '#c19862', avatar: '#c19862' },
  user:    { bg: '#6890c218', fg: '#6890c2', avatar: '#6890c2' },
};

const RoleBadge = styled.span<{ $bg: string; $fg: string }>`
  display: inline-block; padding: 2px 10px; border-radius: 99px;
  font-size: 0.6875rem; font-weight: 600;
  background: linear-gradient(135deg, ${({ $bg }) => $bg} 0%, ${({ $bg }) => $bg}dd 100%);
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

const DpActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-left: 12px;
  border-left: 2px solid ${({ theme }) => theme.colors.border};
`;

const DpActivityItem = styled.div`
  position: relative;
  padding: 8px 0 8px 16px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex;
  justify-content: space-between;
  align-items: center;

  &::before {
    content: '';
    position: absolute;
    left: -18px;
    top: 14px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #6890c2;
    border: 2px solid ${({ theme }) => theme.colors.surface};
  }
`;

const DpActivityTime = styled.span`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  white-space: nowrap;
  margin-left: 12px;
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
  background: ${({ $active }) => $active ? '#567ebb18' : 'transparent'};
  color: ${({ $active, theme }) => $active ? '#567ebb' : theme.colors.textTertiary};
  border: 1px solid ${({ $active }) => $active ? '#567ebb40' : '#0f172a18'};
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
    $variant === 'danger' ? '#c47474' :
    $variant === 'primary' ? '#567ebb' : theme.colors.surfaceMuted};
  color: ${({ $variant }) =>
    $variant === 'danger' ? '#fff' :
    $variant === 'primary' ? '#fff' : 'inherit'};
  &:hover { opacity: 0.85; }
`;

/* ── Mock activity log data ── */

interface ActivityEntry {
  action: string;
  time: string;
}

const MOCK_ACTIVITY: Record<string, ActivityEntry[]> = {};

function getActivityLog(userId: string): ActivityEntry[] {
  if (MOCK_ACTIVITY[userId]) return MOCK_ACTIVITY[userId];
  const actions = [
    'Logged in', 'Updated settings', 'Exported leads', 'Changed password',
    'Viewed dashboard', 'Added new lead', 'Updated profile', 'Generated report',
    'Invited team member', 'Archived old contacts',
  ];
  const log: ActivityEntry[] = [];
  for (let i = 0; i < 5; i++) {
    const hrs = i * 4 + Math.floor(Math.random() * 4);
    log.push({
      action: actions[(userId.charCodeAt(0) + i) % actions.length],
      time: `${hrs}h ago`,
    });
  }
  MOCK_ACTIVITY[userId] = log;
  return log;
}

/* ── All possible permissions for display ── */

const ALL_PERMISSIONS = ['read', 'write', 'delete', 'export', 'manage_users', 'admin'];

/* ── Helpers ── */

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

function roleProps(role: string) {
  const lower = role.toLowerCase();
  return ROLE_COLORS[lower] ?? { bg: '#0f172a18', fg: '#0f172a', avatar: '#6c757d' };
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
  const { data, isLoading } = useUsers();
  const users: UserItem[] = (data as any)?.users ?? (Array.isArray(data) ? data : []);

  const [activeTab, setActiveTab] = useState<RoleFilter>('all');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const handleCloseDetail = useCallback(() => setSelectedUser(null), []);

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
              <DpCloseBtn onClick={handleCloseDetail}>&times;</DpCloseBtn>
            </DpHeader>

            <DpBody>
              {/* Info Section */}
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
                  <DpFieldLabel>Status</DpFieldLabel>
                  <DpFieldValue style={{ color: '#567ebb' }}>Active</DpFieldValue>
                </DpField>
                <DpField>
                  <DpFieldLabel>Join Date</DpFieldLabel>
                  <DpFieldValue>{formatDate(selectedUser.createdAt)}</DpFieldValue>
                </DpField>
                <DpField>
                  <DpFieldLabel>Last Active</DpFieldLabel>
                  <DpFieldValue>Today</DpFieldValue>
                </DpField>
              </DpGrid>

              {/* Activity Log Section */}
              <div>
                <DpSectionTitle>Activity Log</DpSectionTitle>
                <DpActivityList style={{ marginTop: 10 }}>
                  {getActivityLog(selectedUser._id).map((entry, idx) => (
                    <DpActivityItem key={idx}>
                      <span>{entry.action}</span>
                      <DpActivityTime>{entry.time}</DpActivityTime>
                    </DpActivityItem>
                  ))}
                </DpActivityList>
              </div>

              {/* Permissions Section */}
              <div>
                <DpSectionTitle>Permissions</DpSectionTitle>
                <DpPermGrid style={{ marginTop: 10 }}>
                  {ALL_PERMISSIONS.map(perm => (
                    <DpPermBadge key={perm} $active={(selectedUser.permissions ?? []).includes(perm)}>
                      {perm}
                    </DpPermBadge>
                  ))}
                </DpPermGrid>
              </div>
            </DpBody>

            <DpFooter>
              <DpFooterStatus>
                Member since {formatDate(selectedUser.createdAt)}
              </DpFooterStatus>
              <DpActionBtn $variant="primary">編輯</DpActionBtn>
            </DpFooter>
          </DpPanel>
        </>,
        document.body
      )}
    </Page>
  );
};

export default Users;
