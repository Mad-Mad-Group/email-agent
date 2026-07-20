import React, { useState, useEffect } from 'react';
import styled, { css, useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { glassSurface } from '../../styles/glassSurface';
import { media } from '../../styles/media';
import { useMe, useUpdateProfile, useChangePassword } from '../../api/hooks';
import toast from 'react-hot-toast';

/* ══════════════════════════════════════
   User Info — 個人資料頁面 (LUNO style)
   ══════════════════════════════════════ */

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

/* ── Card ── */

const Card = styled.div`
  ${glassSurface};
  border-radius: ${({ theme }) => theme.radii.card}px;
`;

/* ── Profile Hero ── */

const HeroCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.lg}px;
  position: relative;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    background: ${({ theme }) => theme.gradients.brand};
    border-radius: ${({ theme }) => theme.radii.card}px ${({ theme }) => theme.radii.card}px 0 0;
  }
`;

const HeroBody = styled.div`
  display: flex; align-items: center; gap: 20px;
  ${media.mobile} { flex-direction: column; text-align: center; }
`;

const Avatar = styled.div`
  width: 64px; height: 64px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.textInverted};
  display: flex; align-items: center; justify-content: center;
  font-size: 1.35rem; font-weight: 700; letter-spacing: 1px;
  flex-shrink: 0;
`;

const HeroInfo = styled.div`flex: 1;`;

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
  border-radius: 99px;
  font-size: 0.6875rem; font-weight: 600;
  background: ${({ $bg }) => $bg ?? 'rgba(107,114,128,0.08)'};
  color: ${({ $color, theme }) => $color ?? theme.colors.textTertiary};
  border: 1px solid ${({ $bg }) => $bg ? `${$bg}55` : 'rgba(107,114,128,0.12)'};
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  text-transform: capitalize;
`;

/* ── Settings Layout (LUNO style: left tabs + right content) ── */

const SettingsLayout = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 0;
  ${media.mobile} { grid-template-columns: 1fr; }
`;

const TabNav = styled(Card)`
  border-radius: ${({ theme }) => theme.radii.card}px;
  overflow: hidden;
  align-self: start;
  ${media.mobile} {
    display: flex; flex-direction: row;
    border-radius: ${({ theme }) => theme.radii.card}px;
    margin-bottom: ${({ theme }) => theme.spacing.md}px;
  }
`;

const TabItem = styled.button<{ $active?: boolean }>`
  display: flex; align-items: center; gap: 10px;
  width: 100%;
  padding: 14px 20px;
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  color: ${({ $active, theme }) => $active ? theme.colors.accent : theme.colors.textSecondary};
  transition: color 0.15s, background 0.15s;
  text-align: left;
  position: relative;

  ${({ $active, theme }) => $active && css`
    background: ${theme.colors.accent}12;
    font-weight: 600;
    &::before {
      content: '';
      position: absolute;
      left: 0; top: 8px; bottom: 8px;
      width: 3px;
      border-radius: 0 3px 3px 0;
      background: ${theme.colors.accent};
    }
  `}

  &:hover {
    color: ${({ theme }) => theme.colors.accent};
    background: ${({ theme }) => `${theme.colors.accent}0a`};
  }

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }

  ${media.mobile} {
    flex: 1;
    text-align: center;
    justify-content: center;
    padding: 12px 10px;
    & + & { border-top: none; border-left: 1px solid ${({ theme }) => theme.colors.border}; }
    ${({ $active }) => $active && css`
      &::before {
        left: 8px; right: 8px; top: auto; bottom: 0;
        width: auto; height: 3px;
        border-radius: 3px 3px 0 0;
      }
    `}
  }
`;

const TabIcon = styled.span`
  display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; flex-shrink: 0;
  ${media.mobile} { display: none; }
`;

const ContentPanel = styled(Card)`
  margin-left: ${({ theme }) => theme.spacing.md}px;
  ${media.mobile} { margin-left: 0; }
`;

const ContentHeader = styled.div`
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  h2 { margin: 0; font-size: 1rem; font-weight: 600; color: ${({ theme }) => theme.colors.textPrimary}; }
`;

const ContentBody = styled.div`
  padding: ${({ theme }) => theme.spacing.lg}px;
  display: flex; flex-direction: column; gap: 20px;
  ${media.mobile} { padding: ${({ theme }) => theme.spacing.md}px; }
`;

/* ── Form ── */

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  ${media.mobile} { grid-template-columns: 1fr; }
`;

const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 6px;
`;

const Label = styled.label`
  font-size: 0.8125rem; font-weight: 500;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Input = styled.input`
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.canvas};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
  &:focus { border-color: ${({ theme }) => theme.colors.accent}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const BtnRow = styled.div`
  display: flex; gap: 10px; padding-top: 4px;
`;

const SaveBtn = styled.button`
  padding: 10px 24px;
  background: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.textInverted};
  border: none;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const DiscardBtn = styled.button`
  padding: 10px 24px;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  color: ${({ theme }) => theme.colors.textSecondary};
  border: none;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover { opacity: 0.85; }
`;

const ErrorMsg = styled.div`
  font-size: 0.75rem; color: ${({ theme }) => theme.strong.mauve}; margin-top: -4px;
`;

const PwHint = styled.div`
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textTertiary};
`;

/* ── SVG Icons ── */

/* ── Role Icons (inline SVG) ── */

const RoleIconSuperAdmin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
  </svg>
);

const RoleIconAdmin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const RoleIconStaff = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

/* ── Tab Icons ── */

const ProfileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

/* ── Page ── */

/* ── Company tab icon ── */

const CompanyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 3h-8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z" />
  </svg>
);

/* ── Textarea styled ── */

const Textarea = styled.textarea`
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.canvas};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.875rem;
  font-family: inherit;
  outline: none;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.15s;
  &:focus { border-color: ${({ theme }) => theme.colors.accent}; }
`;

type SettingsTab = 'profile' | 'password' | 'company';

const UserInfoPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: me, isLoading } = useMe();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyDesc, setCompanyDesc] = useState('');
  const [companyWeb, setCompanyWeb] = useState('');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    if (me) {
      const u = (me as any)?.data ?? me;
      setName(u.name ?? '');
      setEmail(u.email ?? '');
      setCompanyName(u.companyName ?? '');
      setCompanyDesc(u.companyDescription ?? '');
      setCompanyWeb(u.companyWebsite ?? '');
    }
  }, [me]);

  const user = (me as any)?.data ?? me;
  const role = user?.role ?? 'staff';

  const ROLE_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    super_admin: { label: t('userInfo.roleSuper'), color: theme.strong.mauve, bg: `${theme.strong.mauve}14`, icon: <RoleIconSuperAdmin /> },
    admin:       { label: t('userInfo.roleAdmin'), color: theme.colors.accent, bg: `${theme.colors.accent}14`,  icon: <RoleIconAdmin /> },
    staff:       { label: t('userInfo.roleStaff'), color: theme.colors.textTertiary, bg: `${theme.colors.textTertiary}14`, icon: <RoleIconStaff /> },
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

  const handleDiscardProfile = () => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
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

  const handleSaveCompany = () => {
    const changes: { companyName?: string; companyDescription?: string; companyWebsite?: string } = {};
    if (companyName !== (user?.companyName ?? '')) changes.companyName = companyName;
    if (companyDesc !== (user?.companyDescription ?? '')) changes.companyDescription = companyDesc;
    if (companyWeb !== (user?.companyWebsite ?? '')) changes.companyWebsite = companyWeb;
    if (Object.keys(changes).length === 0) { toast(t('userInfo.noChanges')); return; }
    updateProfile.mutate(changes, {
      onSuccess: () => toast.success(t('userInfo.companyUpdated')),
      onError: (err: any) => toast.error(err?.response?.data?.message ?? t('userInfo.updateFailed')),
    });
  };

  const handleDiscardCompany = () => {
    setCompanyName(user?.companyName ?? '');
    setCompanyDesc(user?.companyDescription ?? '');
    setCompanyWeb(user?.companyWebsite ?? '');
  };

  const handleDiscardPassword = () => {
    setOldPw(''); setNewPw(''); setConfirmPw(''); setPwError('');
  };

  if (isLoading) return <Page><h1 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{t('userInfo.loading')}</h1></Page>;

  return (
    <Page>
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

      {/* ── Settings: left tabs + right content ── */}
      <SettingsLayout>
        <TabNav>
          <TabItem $active={activeTab === 'profile'} onClick={() => setActiveTab('profile')}>
            <TabIcon><ProfileIcon /></TabIcon>
            {t('userInfo.editTitle')}
          </TabItem>
          <TabItem $active={activeTab === 'company'} onClick={() => setActiveTab('company')}>
            <TabIcon><CompanyIcon /></TabIcon>
            {t('userInfo.companyTab')}
          </TabItem>
          <TabItem $active={activeTab === 'password'} onClick={() => setActiveTab('password')}>
            <TabIcon><LockIcon /></TabIcon>
            {t('userInfo.changePassword')}
          </TabItem>
        </TabNav>

        <ContentPanel>
          {activeTab === 'profile' && (
            <>
              <ContentHeader><h2>{t('userInfo.editTitle')}</h2></ContentHeader>
              <ContentBody>
                <FormRow>
                  <FormGroup>
                    <Label>{t('userInfo.labelName')}</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder={t('userInfo.placeholderName')} />
                  </FormGroup>
                  <FormGroup>
                    <Label>{t('userInfo.labelEmail')}</Label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('userInfo.placeholderEmail')} />
                  </FormGroup>
                </FormRow>
                <BtnRow>
                  <DiscardBtn onClick={handleDiscardProfile}>{t('userInfo.discard') || 'Discard'}</DiscardBtn>
                  <SaveBtn disabled={updateProfile.isPending} onClick={handleSaveProfile}>
                    {updateProfile.isPending ? t('userInfo.saving') : t('userInfo.save')}
                  </SaveBtn>
                </BtnRow>
              </ContentBody>
            </>
          )}

          {activeTab === 'company' && (
            <>
              <ContentHeader><h2>{t('userInfo.companyTab')}</h2></ContentHeader>
              <ContentBody>
                <PwHint>{t('userInfo.companyHint')}</PwHint>
                <FormGroup>
                  <Label>{t('userInfo.labelCompanyName')}</Label>
                  <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder={t('userInfo.placeholderCompanyName')} />
                </FormGroup>
                <FormGroup>
                  <Label>{t('userInfo.labelCompanyDesc')}</Label>
                  <Textarea value={companyDesc} onChange={e => setCompanyDesc(e.target.value)} placeholder={t('userInfo.placeholderCompanyDesc')} />
                </FormGroup>
                <FormGroup>
                  <Label>{t('userInfo.labelCompanyWeb')}</Label>
                  <Input value={companyWeb} onChange={e => setCompanyWeb(e.target.value)} placeholder={t('userInfo.placeholderCompanyWeb')} />
                </FormGroup>
                <BtnRow>
                  <DiscardBtn onClick={handleDiscardCompany}>{t('userInfo.discard') || 'Discard'}</DiscardBtn>
                  <SaveBtn disabled={updateProfile.isPending} onClick={handleSaveCompany}>
                    {updateProfile.isPending ? t('userInfo.saving') : t('userInfo.save')}
                  </SaveBtn>
                </BtnRow>
              </ContentBody>
            </>
          )}

          {activeTab === 'password' && (
            <>
              <ContentHeader><h2>{t('userInfo.changePassword')}</h2></ContentHeader>
              <ContentBody>
                <PwHint>{t('userInfo.pwHint') || 'Minimum 6 characters'}</PwHint>
                <FormGroup>
                  <Label>{t('userInfo.labelOldPw')}</Label>
                  <Input type="password" autoComplete="off" value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder={t('userInfo.placeholderOldPw')} />
                </FormGroup>
                <FormRow>
                  <FormGroup>
                    <Label>{t('userInfo.labelNewPw')}</Label>
                    <Input type="password" autoComplete="new-password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder={t('userInfo.placeholderNewPw')} />
                  </FormGroup>
                  <FormGroup>
                    <Label>{t('userInfo.labelConfirmPw')}</Label>
                    <Input type="password" autoComplete="new-password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder={t('userInfo.placeholderConfirmPw')} />
                  </FormGroup>
                </FormRow>
                {pwError && <ErrorMsg>{pwError}</ErrorMsg>}
                <BtnRow>
                  <DiscardBtn onClick={handleDiscardPassword}>{t('userInfo.discard') || 'Discard'}</DiscardBtn>
                  <SaveBtn disabled={changePassword.isPending} onClick={handleChangePassword}>
                    {changePassword.isPending ? t('userInfo.changingPw') : t('userInfo.changePwBtn')}
                  </SaveBtn>
                </BtnRow>
              </ContentBody>
            </>
          )}
        </ContentPanel>
      </SettingsLayout>
    </Page>
  );
};

export default UserInfoPage;
