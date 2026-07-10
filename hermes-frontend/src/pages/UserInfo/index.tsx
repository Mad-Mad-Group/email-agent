import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { media } from '../../styles/media';
import { useMe, useUpdateProfile, useChangePassword } from '../../api/hooks';
import toast from 'react-hot-toast';

/* ══════════════════════════════════════
   User Info — 個人資料頁面
   ══════════════════════════════════════ */

const formatDate = (d?: string | Date) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
};

const getInitials = (name?: string, email?: string) => {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  return email ? email.slice(0, 2).toUpperCase() : '??';
};

/* ── Layout ── */

const Page = styled.div`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing.md}px;`;

const Breadcrumb = styled.ol`
  list-style: none; margin: 0; padding: 0; display: flex; gap: ${({ theme }) => theme.spacing.sm}px;
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary};
  li + li::before { content: '/'; margin-right: ${({ theme }) => theme.spacing.sm}px; }
`;

const PageTitle = styled.h1`
  font-size: 1.15rem; font-weight: 600; margin: 4px 0 0;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const PageSub = styled.small`
  color: ${({ theme }) => theme.colors.textTertiary}; font-size: 0.8125rem;
`;

const Grid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: ${({ theme }) => theme.spacing.md}px;
  ${media.mobile} { grid-template-columns: 1fr; }
`;

/* ── Card ── */

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const CardHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  h2 { margin: 0; font-size: 1rem; font-weight: 600; color: ${({ theme }) => theme.colors.textPrimary}; }
`;

const CardBody = styled.div`
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  display: flex; flex-direction: column; gap: 16px;
  ${media.mobile} { padding: ${({ theme }) => theme.spacing.md}px; }
`;

/* ── Profile Hero ── */

const HeroCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.lg}px;
`;

const HeroBody = styled.div`
  display: flex; align-items: center; gap: 20px;
  ${media.mobile} { flex-direction: column; text-align: center; }
`;

const Avatar = styled.div`
  width: 64px; height: 64px;
  border-radius: ${({ theme }) => theme.radii.card}px;
  background: var(--primary, #0ea5e9);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.35rem; font-weight: 700; letter-spacing: 1px;
  flex-shrink: 0;
`;

const HeroInfo = styled.div`
  flex: 1;
`;

const HeroName = styled.h2`
  margin: 0; font-size: 1.25rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const HeroEmail = styled.div`
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary}; margin-top: 2px;
`;

const HeroMeta = styled.div`
  display: flex; gap: 16px; margin-top: 6px; flex-wrap: wrap;
  ${media.mobile} { justify-content: center; }
`;

const MetaChip = styled.span<{ $color?: string; $bg?: string }>`
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 0.75rem; font-weight: 500;
  background: ${({ $bg }) => $bg ?? 'rgba(107,114,128,0.08)'};
  color: ${({ $color }) => $color ?? '#6b7280'};
`;

/* ── Stats Row ── */

const StatsRow = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: ${({ theme }) => theme.spacing.md}px;
  ${media.mobile} { grid-template-columns: 1fr; }
`;

const StatCard = styled(Card)`
  padding: 16px 20px;
  display: flex; align-items: center; gap: 14px;
`;

const StatIcon = styled.div<{ $bg: string }>`
  width: 40px; height: 40px;
  border-radius: 10px;
  background: ${({ $bg }) => $bg};
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
`;

const StatContent = styled.div``;

const StatLabel = styled.div`
  font-size: 0.7rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const StatValue = styled.div`
  font-size: 0.9375rem; font-weight: 600; margin-top: 2px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

/* ── Form ── */

const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 4px;
`;

const Label = styled.label`
  font-size: 0.8125rem; font-weight: 500;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.canvas};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
  &:focus { border-color: var(--primary, #0ea5e9); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const SaveBtn = styled.button`
  align-self: flex-start;
  padding: 8px 20px;
  background: var(--primary, #0ea5e9);
  color: #fff;
  border: none;
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ErrorMsg = styled.div`
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.red}; margin-top: -4px;
`;

/* ── SVG Icons ── */

const SvgIcon: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="currentColor" viewBox="0 0 16 16">
    {children}
  </svg>
);

/* ── Page ── */

const UserInfoPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: me, isLoading } = useMe();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    if (me) {
      const u = (me as any)?.data ?? me;
      setName(u.name ?? '');
      setEmail(u.email ?? '');
    }
  }, [me]);

  const user = (me as any)?.data ?? me;
  const role = user?.role ?? 'staff';

  const ROLE_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    super_admin: { label: t('userInfo.roleSuper'), color: '#dc2626', bg: 'rgba(220,38,38,0.08)', icon: '👑' },
    admin:       { label: t('userInfo.roleAdmin'), color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)',  icon: '🛡️' },
    staff:       { label: t('userInfo.roleStaff'), color: '#6b7280', bg: 'rgba(107,114,128,0.08)', icon: '👤' },
  };

  const roleInfo = ROLE_MAP[role] ?? ROLE_MAP.staff;

  const handleSaveProfile = () => {
    const changes: { name?: string; email?: string } = {};
    if (name !== (user?.name ?? '')) changes.name = name;
    if (email !== (user?.email ?? '')) changes.email = email;
    if (Object.keys(changes).length === 0) { toast(t('userInfo.noChanges')); return; }
    updateProfile.mutate(changes, {
      onSuccess: () => toast.success(t('userInfo.profileUpdated')),
      onError: (err: any) => toast.error(err?.response?.data?.message ?? t('userInfo.updateFailed')),
    });
  };

  const handleChangePassword = () => {
    setPwError('');
    if (!oldPw || !newPw || !confirmPw) { setPwError(t('userInfo.pwAllFields')); return; }
    if (newPw.length < 6) { setPwError(t('userInfo.pwMinLength')); return; }
    if (newPw !== confirmPw) { setPwError(t('userInfo.pwMismatch')); return; }
    changePassword.mutate({ oldPassword: oldPw, newPassword: newPw }, {
      onSuccess: () => { toast.success(t('userInfo.pwUpdated')); setOldPw(''); setNewPw(''); setConfirmPw(''); },
      onError: (err: any) => { const msg = err?.response?.data?.message ?? t('userInfo.pwFailed'); setPwError(msg); toast.error(msg); },
    });
  };

  if (isLoading) return <Page><PageTitle>{t('userInfo.loading')}</PageTitle></Page>;

  return (
    <Page>
      <div>
        <Breadcrumb><li>{t('userInfo.breadcrumbCms')}</li><li>{t('userInfo.breadcrumbProfile')}</li></Breadcrumb>
        <PageTitle>{t('userInfo.title')}</PageTitle>
        <PageSub>{t('userInfo.subtitle')}</PageSub>
      </div>

      {/* ── Hero profile card ── */}
      <HeroCard>
        <HeroBody>
          <Avatar>{getInitials(user?.name, user?.email)}</Avatar>
          <HeroInfo>
            <HeroName>{user?.name ?? '—'}</HeroName>
            <HeroEmail>{user?.email ?? '—'}</HeroEmail>
            <HeroMeta>
              <MetaChip $color={roleInfo.color} $bg={roleInfo.bg}>
                {roleInfo.icon} {roleInfo.label}
              </MetaChip>
            </HeroMeta>
          </HeroInfo>
        </HeroBody>
      </HeroCard>

      {/* ── Info stats ── */}
      <StatsRow>
        <StatCard>
          <StatIcon $bg="rgba(14,165,233,0.08)">
            <SvgIcon><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /><path opacity="0.5" d="M2 13c0-2.21 2.686-4 6-4s6 1.79 6 4v1H2v-1z" /></SvgIcon>
          </StatIcon>
          <StatContent>
            <StatLabel>{t('userInfo.statRole')}</StatLabel>
            <StatValue>{roleInfo.label}</StatValue>
          </StatContent>
        </StatCard>
        <StatCard>
          <StatIcon $bg="rgba(22,163,74,0.08)">
            <SvgIcon><path d="M6.445 11.688V6.354h-.633A12.6 12.6 0 0 0 4.5 7.16v.695c.375-.257.969-.62 1.258-.777h.012v4.61h.675z" /><path opacity="0.5" d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" /></SvgIcon>
          </StatIcon>
          <StatContent>
            <StatLabel>{t('userInfo.statCreated')}</StatLabel>
            <StatValue>{formatDate(user?.created_at)}</StatValue>
          </StatContent>
        </StatCard>
        <StatCard>
          <StatIcon $bg="rgba(147,51,234,0.08)">
            <SvgIcon><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z" /><path opacity="0.5" d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z" /></SvgIcon>
          </StatIcon>
          <StatContent>
            <StatLabel>{t('userInfo.statUpdated')}</StatLabel>
            <StatValue>{formatDate(user?.updated_at)}</StatValue>
          </StatContent>
        </StatCard>
      </StatsRow>

      {/* ── Edit forms ── */}
      <Grid>
        <Card>
          <CardHeader><h2>{t('userInfo.editTitle')}</h2></CardHeader>
          <CardBody>
            <FormGroup>
              <Label>{t('userInfo.labelName')}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={t('userInfo.placeholderName')} />
            </FormGroup>
            <FormGroup>
              <Label>{t('userInfo.labelEmail')}</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('userInfo.placeholderEmail')} />
            </FormGroup>
            <SaveBtn disabled={updateProfile.isPending} onClick={handleSaveProfile}>
              {updateProfile.isPending ? t('userInfo.saving') : t('userInfo.save')}
            </SaveBtn>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2>{t('userInfo.changePassword')}</h2></CardHeader>
          <CardBody>
            <FormGroup>
              <Label>{t('userInfo.labelOldPw')}</Label>
              <Input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder={t('userInfo.placeholderOldPw')} />
            </FormGroup>
            <FormGroup>
              <Label>{t('userInfo.labelNewPw')}</Label>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder={t('userInfo.placeholderNewPw')} />
            </FormGroup>
            <FormGroup>
              <Label>{t('userInfo.labelConfirmPw')}</Label>
              <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder={t('userInfo.placeholderConfirmPw')} />
            </FormGroup>
            {pwError && <ErrorMsg>{pwError}</ErrorMsg>}
            <SaveBtn disabled={changePassword.isPending} onClick={handleChangePassword}>
              {changePassword.isPending ? t('userInfo.changingPw') : t('userInfo.changePwBtn')}
            </SaveBtn>
          </CardBody>
        </Card>
      </Grid>
    </Page>
  );
};

export default UserInfoPage;
