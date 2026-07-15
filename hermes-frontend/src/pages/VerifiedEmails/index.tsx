import React, { useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { media } from '../../styles/media';
import { useVerifiedEmails, useVerifiedEmailStats, useCreateVerifiedEmail, useDeleteVerifiedEmail } from '../../api/hooks';
import { VerifiedEmailItem, verifiedEmailsApi } from '../../api/services';
import SpriteAvatar from '../../components/SpriteAvatar';
import { AGENTS } from '../../config/agents';

/* ══════════════════════════════════════
   Verified Emails Pool — 共用已驗證郵箱
   ══════════════════════════════════════ */

/* ── Icons ── */

const PoolIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1a2.5 2.5 0 00-2.5 2.5v1h5v-1A2.5 2.5 0 008 1zM4.5 4.5v-1a3.5 3.5 0 117 0v1h1a1 1 0 011 1v8a1 1 0 01-1 1h-9a1 1 0 01-1-1v-8a1 1 0 011-1h1z" fill="currentColor"/>
    <path d="M8 9a1 1 0 100-2 1 1 0 000 2zm0 1c-.55 0-1 .45-1 1v1h2v-1c0-.55-.45-1-1-1z" fill="currentColor" opacity="0.5"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.485 1.929a.75.75 0 010 1.06l-7.07 7.072a.75.75 0 01-1.061 0L2.515 7.222a.75.75 0 011.06-1.06l2.133 2.132 6.54-6.54a.75.75 0 011.237.175z" fill="currentColor"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z" fill="currentColor"/>
    <path d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 010-2H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118z" fill="currentColor"/>
  </svg>
);

const ExportIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M.5 9.9a.5.5 0 01.5.5v2.5a1 1 0 001 1h12a1 1 0 001-1v-2.5a.5.5 0 011 0v2.5a2 2 0 01-2 2H2a2 2 0 01-2-2v-2.5a.5.5 0 01.5-.5z" fill="currentColor"/>
    <path d="M7.646 1.146a.5.5 0 01.708 0l3 3a.5.5 0 01-.708.708L8.5 2.707V11.5a.5.5 0 01-1 0V2.707L5.354 4.854a.5.5 0 11-.708-.708l3-3z" fill="currentColor"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z" fill="currentColor"/>
  </svg>
);

/* ── Layout ── */

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

const PageTitle = styled.h1`font-size: 1.25rem; font-weight: 700; margin: 0; color: ${({ theme }) => theme.colors.textPrimary};`;
const PageSub = styled.p`font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary}; margin: 2px 0 0;`;

const ToolbarRow = styled.div`
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
`;

const SearchInput = styled.input`
  padding: 6px 12px; border-radius: ${({ theme }) => theme.radii.control}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface}; color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.8125rem; width: 220px; outline: none; transition: border-color 0.15s;
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; }
  &:focus { border-color: var(--primary, #0ea5e9); }
`;

const Btn = styled.button<{ $variant?: 'primary' | 'danger' | 'ghost' }>`
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: ${({ theme }) => theme.radii.control}px;
  font-size: 0.8125rem; font-weight: 500;
  cursor: pointer; border: 1px solid transparent; transition: all 0.15s;
  ${({ $variant, theme }) => {
    if ($variant === 'primary') return `background: var(--primary, #0ea5e9); color: #fff; &:hover { opacity: 0.9; }`;
    if ($variant === 'danger') return `background: transparent; color: ${theme.colors.red}; border-color: ${theme.colors.red}; &:hover { background: ${theme.colors.red}; color: #fff; }`;
    return `background: ${theme.colors.surface}; color: ${theme.colors.textSecondary}; border-color: ${theme.colors.border}; &:hover { background: ${theme.colors.surfaceMuted}; }`;
  }}
`;

/* ── Stats Cards (LUNO style — aligned with Leads) ── */

const StatCardsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.md}px;
  ${media.mobile} { grid-template-columns: repeat(2, 1fr); }
`;

const LunoStatCard = styled.div<{ $accent: string; $bg1: string; $bg2: string }>`
  position: relative; overflow: hidden;
  border-radius: ${({ theme }) => theme.radii.card}px;
  border-left: 4px solid ${({ $accent }) => $accent};
  background: ${({ theme, $bg1, $bg2 }) =>
    theme.mode === 'dark'
      ? theme.colors.surface
      : `linear-gradient(135deg, ${$bg1}, ${$bg2})`};
  padding: 18px 20px 16px;
  transition: transform 0.18s, box-shadow 0.18s;
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.10); }
`;

const StatWatermark = styled.span<{ $color: string }>`
  position: absolute; right: -4px; bottom: -6px;
  width: 56px; height: 56px; opacity: 0.10;
  pointer-events: none;
  color: ${({ $color }) => $color};
  line-height: 0;
  svg { width: 100%; height: 100%; }
`;

const StatLabel = styled.span`
  font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; opacity: 0.55;
  color: ${({ theme }) => theme.colors.textPrimary}; margin-bottom: 6px; display: block;
`;

const StatValueRow = styled.div`display: flex; align-items: baseline; gap: 6px;`;
const StatNumber = styled.span<{ $color: string }>`font-size: 2rem; font-weight: 800; color: ${({ $color }) => $color}; line-height: 1;`;
const StatUnit = styled.span`font-size: 0.875rem; color: ${({ theme }) => theme.colors.textTertiary};`;

/* watermark icons (stroke style, matching Leads) */
const WmShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
  </svg>
);
const WmHeart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const WmMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);
const WmStar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

/* ── Table ── */

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  overflow: hidden;
`;

const TableWrap = styled.div`overflow-x: auto;`;

const Table = styled.table`
  width: 100%; border-collapse: collapse; font-size: 0.8125rem;
  th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid ${({ theme }) => theme.colors.border}; }
  th { font-weight: 600; color: ${({ theme }) => theme.colors.textTertiary}; background: ${({ theme }) => theme.colors.canvas}; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.5px; }
  td { color: ${({ theme }) => theme.colors.textPrimary}; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: ${({ theme }) => theme.colors.surfaceMuted}; }
`;

const Badge = styled.span<{ $color?: string }>`
  display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.6875rem; font-weight: 600;
  background: ${({ $color }) => $color ? `${$color}20` : '#0ea5e920'};
  color: ${({ $color }) => $color || '#0ea5e9'};
`;

const NoData = styled.div`
  padding: 60px 40px; text-align: center; color: ${({ theme }) => theme.colors.textTertiary}; font-size: 0.875rem;
  display: flex; flex-direction: column; align-items: center; gap: 16px;
`;

const EmptyIllustration = () => (
  <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="15" width="80" height="60" rx="8" fill="#e0f2fe" stroke="#93c5fd" strokeWidth="1.5"/>
    <rect x="32" y="30" width="56" height="4" rx="2" fill="#93c5fd" opacity="0.6"/>
    <rect x="32" y="40" width="40" height="4" rx="2" fill="#93c5fd" opacity="0.4"/>
    <rect x="32" y="50" width="48" height="4" rx="2" fill="#93c5fd" opacity="0.3"/>
    <circle cx="90" cy="72" r="20" fill="#dcfce7" stroke="#86efac" strokeWidth="1.5"/>
    <path d="M82 72l5 5 10-10" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EmptyHint = styled.p`
  margin: 0; font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary}; opacity: 0.8;
`;

/* ── Pagination ── */

const PaginationRow = styled.div`
  display: flex; align-items: center; justify-content: space-between; padding: 10px 14px;
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textTertiary};
`;

const PageBtn = styled.button<{ $active?: boolean }>`
  padding: 4px 10px; border-radius: ${({ theme }) => theme.radii.control}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $active }) => $active ? 'var(--primary, #0ea5e9)' : 'transparent'};
  color: ${({ $active }) => $active ? '#fff' : 'inherit'};
  cursor: pointer; font-size: 0.75rem; margin: 0 2px;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

/* ── Add Modal ── */

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;

const Overlay = styled.div`
  position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  animation: ${fadeIn} 0.15s ease;
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  padding: 24px; width: 400px; max-width: 90vw;
  box-shadow: 0 12px 40px rgba(0,0,0,0.2);
`;

const ModalTitle = styled.h6`margin: 0 0 16px; font-size: 1rem; font-weight: 600; color: ${({ theme }) => theme.colors.textPrimary};`;

const Field = styled.div`margin-bottom: 12px;`;
const Label = styled.label`display: block; font-size: 0.75rem; font-weight: 500; color: ${({ theme }) => theme.colors.textSecondary}; margin-bottom: 4px;`;
const Input = styled.input`
  width: 100%; padding: 8px 10px; border-radius: ${({ theme }) => theme.radii.control}px; font-size: 0.8125rem;
  border: 1px solid ${({ theme }) => theme.colors.border}; background: ${({ theme }) => theme.colors.canvas};
  color: ${({ theme }) => theme.colors.textPrimary}; outline: none; transition: border-color 0.15s;
  &:focus { border-color: var(--primary, #0ea5e9); }
`;
const Textarea = styled.textarea`
  width: 100%; padding: 8px 10px; border-radius: ${({ theme }) => theme.radii.control}px; font-size: 0.8125rem; min-height: 60px; resize: vertical;
  border: 1px solid ${({ theme }) => theme.colors.border}; background: ${({ theme }) => theme.colors.canvas};
  color: ${({ theme }) => theme.colors.textPrimary}; outline: none; transition: border-color 0.15s;
  &:focus { border-color: var(--primary, #0ea5e9); }
`;

const ModalActions = styled.div`display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;`;

/* ── Component ── */

const methodColors: Record<string, string> = {
  auto_reply_count: '#10b981',
  ai_check: '#0ea5e9',
  manual: '#f59e0b',
};

const VerifiedEmailsPage: React.FC = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', company_name: '', notes: '' });

  const methodLabels: Record<string, string> = {
    auto_reply_count: t('verifiedEmails.methodAutoReply'),
    ai_check: t('verifiedEmails.methodAiCheck'),
    manual: t('verifiedEmails.methodManual'),
  };

  const limit = 20;
  const { data, isLoading } = useVerifiedEmails({ page, limit, search: search || undefined });
  const { data: stats } = useVerifiedEmailStats();
  const createMut = useCreateVerifiedEmail();
  const deleteMut = useDeleteVerifiedEmail();

  const items: VerifiedEmailItem[] = (data as any)?.data ?? [];
  const total: number = (data as any)?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleAdd = useCallback(() => {
    if (!addForm.email || !addForm.company_name) return;
    createMut.mutate(addForm, {
      onSuccess: () => {
        setShowAdd(false);
        setAddForm({ email: '', company_name: '', notes: '' });
      },
    });
  }, [addForm, createMut]);

  const handleDelete = useCallback((id: string) => {
    if (!confirm(t('verifiedEmails.confirmDelete'))) return;
    deleteMut.mutate(id);
  }, [deleteMut, t]);

  const handleExport = useCallback(() => {
    window.open(verifiedEmailsApi.exportUrl(), '_blank');
  }, []);

  const statTotal = (stats as any)?.total ?? 0;
  const statActive = (stats as any)?.active ?? 0;
  const statByMethod = (stats as any)?.byMethod ?? [];

  return (
    <Page>
      <PageCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <SpriteAvatar src={AGENTS.S4.sprite} frames={AGENTS.S4.frames} frameW={AGENTS.S4.frameW} frameH={AGENTS.S4.frameH} size={48} />
        <div><PageTitle>{t('verifiedEmails.title')}</PageTitle><PageSub>{t('verifiedEmails.subtitle')}</PageSub></div>
      </div>

      {/* Stats — same layout as Leads */}
      <StatCardsRow>
        <LunoStatCard $accent="#0ea5e9" $bg1="#ecfeff" $bg2="#cffafe">
          <StatLabel>{t('verifiedEmails.totalVerified')}</StatLabel>
          <StatValueRow><StatNumber $color="#0ea5e9">{statTotal}</StatNumber><StatUnit>{t('verifiedEmails.unit')}</StatUnit></StatValueRow>
          <StatWatermark $color="#0ea5e9"><WmShield /></StatWatermark>
        </LunoStatCard>
        <LunoStatCard $accent="#16a34a" $bg1="#f0fdf4" $bg2="#dcfce7">
          <StatLabel>{t('verifiedEmails.active')}</StatLabel>
          <StatValueRow><StatNumber $color="#16a34a">{statActive}</StatNumber><StatUnit>{t('verifiedEmails.unit')}</StatUnit></StatValueRow>
          <StatWatermark $color="#16a34a"><WmHeart /></StatWatermark>
        </LunoStatCard>
        {statByMethod.map((m: any, i: number) => {
          const palettes = [
            { accent: '#f59e0b', bg1: '#fffbeb', bg2: '#fef3c7', Wm: WmMail },
            { accent: '#8b5cf6', bg1: '#faf5ff', bg2: '#ede9fe', Wm: WmStar },
            { accent: '#ec4899', bg1: '#fdf2f8', bg2: '#fce7f3', Wm: WmShield },
          ];
          const p = palettes[i % palettes.length];
          return (
            <LunoStatCard key={m._id} $accent={p.accent} $bg1={p.bg1} $bg2={p.bg2}>
              <StatLabel>{methodLabels[m._id] ?? m._id}</StatLabel>
              <StatValueRow><StatNumber $color={p.accent}>{m.count}</StatNumber><StatUnit>{t('verifiedEmails.unit')}</StatUnit></StatValueRow>
              <StatWatermark $color={p.accent}><p.Wm /></StatWatermark>
            </LunoStatCard>
          );
        })}
      </StatCardsRow>

      {/* Toolbar */}
      <ToolbarRow>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <SearchInput
            placeholder={t('verifiedEmails.searchPlaceholder')}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <Btn onClick={handleExport}><ExportIcon /> {t('verifiedEmails.export')}</Btn>
          <Btn $variant="primary" onClick={() => setShowAdd(true)}><PlusIcon /> {t('verifiedEmails.add')}</Btn>
        </div>
      </ToolbarRow>

      {/* Table */}
        <TableWrap>
          {isLoading ? (
            <NoData>{t('verifiedEmails.loading')}</NoData>
          ) : items.length === 0 ? (
            <NoData>
              <EmptyIllustration />
              {t('verifiedEmails.noData')}
              <EmptyHint>{t('verifiedEmails.noDataHint')}</EmptyHint>
            </NoData>
          ) : (
            <>
              <Table>
                <thead>
                  <tr>
                    <th>{t('verifiedEmails.thEmail')}</th>
                    <th>{t('verifiedEmails.thCompany')}</th>
                    <th>{t('verifiedEmails.thDomain')}</th>
                    <th>{t('verifiedEmails.thMethod')}</th>
                    <th>{t('verifiedEmails.thReplies')}</th>
                    <th>{t('verifiedEmails.thMatches')}</th>
                    <th>{t('verifiedEmails.thStatus')}</th>
                    <th>{t('verifiedEmails.thCreated')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item._id}>
                      <td>{item.email}</td>
                      <td>{item.company_name}</td>
                      <td style={{ color: 'inherit', opacity: 0.7 }}>{item.domain}</td>
                      <td>
                        <Badge $color={methodColors[item.verification_method]}>
                          {methodLabels[item.verification_method] ?? item.verification_method}
                        </Badge>
                      </td>
                      <td>{item.reply_count}</td>
                      <td>{item.match_count}</td>
                      <td>
                        <Badge $color={item.status === 'active' ? '#10b981' : '#ef4444'}>
<<<<<<< Updated upstream
                          {item.status === 'active' ? t('verifiedEmails.statusActive') : t('verifiedEmails.statusInactive')}
=======
                          {item.status === 'active' ? t('verifiedEmails.active') : item.status}
>>>>>>> Stashed changes
                        </Badge>
                      </td>
                      <td style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <Btn $variant="danger" onClick={() => handleDelete(item._id)} style={{ padding: '4px 8px' }}>
                          <TrashIcon />
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <PaginationRow>
                <span>{t('verifiedEmails.showing')} {(page - 1) * limit + 1}–{Math.min(page * limit, total)} {t('verifiedEmails.of')} {total}</span>
                <div>
                  <PageBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('verifiedEmails.prev')}</PageBtn>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const p = i + 1;
                    return <PageBtn key={p} $active={p === page} onClick={() => setPage(p)}>{p}</PageBtn>;
                  })}
                  {totalPages > 5 && <span>...</span>}
                  <PageBtn disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t('verifiedEmails.next')}</PageBtn>
                </div>
              </PaginationRow>
            </>
          )}
        </TableWrap>
      </PageCard>

      {/* Add Modal */}
      {showAdd && (
        <Overlay onClick={() => setShowAdd(false)}>
          <Modal onClick={e => e.stopPropagation()}>
            <ModalTitle>{t('verifiedEmails.addTitle')}</ModalTitle>
            <Field>
              <Label>{t('verifiedEmails.labelEmail')}</Label>
              <Input
                value={addForm.email}
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                placeholder={t('verifiedEmails.placeholderEmail')}
              />
            </Field>
            <Field>
              <Label>{t('verifiedEmails.labelCompany')}</Label>
              <Input
                value={addForm.company_name}
                onChange={e => setAddForm(f => ({ ...f, company_name: e.target.value }))}
                placeholder={t('verifiedEmails.placeholderCompany')}
              />
            </Field>
            <Field>
              <Label>{t('verifiedEmails.labelNotes')}</Label>
              <Textarea
                value={addForm.notes}
                onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                placeholder={t('verifiedEmails.placeholderNotes')}
              />
            </Field>
            <ModalActions>
              <Btn onClick={() => setShowAdd(false)}>{t('verifiedEmails.cancel')}</Btn>
              <Btn $variant="primary" onClick={handleAdd} disabled={createMut.isPending}>
                <CheckIcon /> {createMut.isPending ? t('verifiedEmails.adding') : t('verifiedEmails.add')}
              </Btn>
            </ModalActions>
          </Modal>
        </Overlay>
      )}
    </Page>
  );
};

export default VerifiedEmailsPage;
