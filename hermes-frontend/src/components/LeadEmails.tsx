import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes, css, useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useEmailQueue, useApproveEmail, useRejectEmail, useSendEmail } from '../api/hooks';
import { EmailItem } from '../api/emailQueue';
import { useDialog } from '../components';
import { ReplyBadge, DpSectionTitle } from './LeadDetailPanel';
import client from '../api/client';

/* ── (mock data removed — real API only) ── */

/* ── Helper functions ── */

const getEmailTypeLabel = (t: (k: string) => string, theme: any) => ({
  reply:      { text: t('leads.emailTypeReply'),      bg: theme.pastel.olive, fg: theme.colors.textPrimary },
  followup:   { text: t('leads.emailTypeFollowup'),   bg: theme.pastel.gold,  fg: theme.colors.textPrimary },
  reoutreach: { text: t('leads.emailTypeReoutreach'), bg: theme.pastel.mauve, fg: theme.colors.textPrimary },
} as Record<string, { text: string; bg: string; fg: string }>);

const getEmailStatusColor = (_theme: any): Record<string, { bg: string; fg: string }> => ({
  pending:  { bg: '#fff3e0', fg: '#e65100' },
  approved: { bg: '#e8f5e9', fg: '#2e7d32' },
  sent:     { bg: '#e3f2fd', fg: '#1565c0' },
  rejected: { bg: '#fce4ec', fg: '#c62828' },
  failed:   { bg: '#fff3e0', fg: '#e65100' },
});

/* ── Keyframes ── */

const glowPulseGreen = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(76,175,80,0.3); }
  50% { box-shadow: 0 0 16px rgba(76,175,80,0.5), 0 0 32px rgba(76,175,80,0.2); }
`;
const glowPulseGold = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(255,193,7,0.35); }
  50% { box-shadow: 0 0 16px rgba(255,193,7,0.55), 0 0 32px rgba(255,193,7,0.2); }
`;

/* ── Styled components ── */

const EmailCard = styled.div<{ $expanded?: boolean; $status?: string }>`
  border-radius: 10px;
  max-width: 100%;
  padding: 14px 18px;
  position: relative;
  overflow: hidden;
  transition: background 0.2s;
  /* pending */
  ${({ $status }) => $status === 'pending' && css`
    background: #fffef5;
    border: 1.5px solid #ffe082;
    box-shadow: 0 0 6px rgba(255,193,7,0.2);
    animation: ${glowPulseGold} 2s ease-in-out infinite;
  `}
  /* approved */
  ${({ $status }) => $status === 'approved' && css`
    background: #f8fcf8;
    border: 1.5px solid #a5d6a7;
    box-shadow: 0 0 6px rgba(76,175,80,0.2);
    animation: ${glowPulseGreen} 2s ease-in-out infinite;
  `}
  /* sent */
  ${({ $status }) => $status === 'sent' && css`
    background: #f9fcf9;
    border: 1px solid #e0efe0;
  `}
  /* rejected */
  ${({ $status }) => $status === 'rejected' && css`
    background: #fff5f5;
    border: 1px solid #f5c6c6;
    &::after {
      content: '✗';
      position: absolute;
      bottom: 6px;
      right: 12px;
      font-size: 4rem;
      font-weight: 800;
      color: rgba(211, 47, 47, 0.13);
      pointer-events: none;
      line-height: 1;
    }
  `}
  /* failed */
  ${({ $status }) => $status === 'failed' && css`
    background: #fffafa;
    border: 1px solid #f5d5d5;
  `}
  /* fallback */
  ${({ $status }) => !$status && css`
    background: #fafafa;
    border: 1px solid #eee;
  `}
`;
const EmailCardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`;
const EmailCardSubject = styled.span`
  font-weight: 600;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const EmailCardDate = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  white-space: nowrap;
`;
const EmailCardBody = styled.div`
  padding: 4px 8px;
  font-family: 'Times New Roman', 'Noto Serif TC', 'Noto Serif SC', serif;
`;
const EmailBodyContent = styled.div`
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  font-size: 1rem;
  line-height: 1.7;
  color: #555;
  max-width: 100%;
  overflow-x: hidden;
`;
const EmailCardMeta = styled.div`
  margin-top: 10px;
  padding-top: 8px;
  border-top: 0.5px solid #e2e2e2;
  font-size: 0.8125rem;
  color: #888;
`;
const EmailSummary = styled.div`
  margin: 0;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  border: 0.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  align-items: flex-start;
  gap: 6px;
`;
const EmailSummaryLabel = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
  white-space: nowrap;
  flex-shrink: 0;
`;
const EmailCardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
`;
const EmailActionBtn = styled.button<{ $bg: string; $fg: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border: 0.5px solid #e5737388;
  border-radius: 99px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #c62828;
  background: #fce4ec;
  cursor: pointer;
  transition: background 0.15s var(--ease-out);
  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) { background: #f8bbd0; }
  }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const LeadSendBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 18px;
  border: none;
  border-radius: 99px;
  background: #43a047;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s var(--ease-out);
  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) { background: #388e3c; }
  }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

/* ── Internal styled components used by LeadEmails ── */

const EmailTypeBadge = styled.span<{ $bg: string; $fg: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
  white-space: nowrap;
  cursor: pointer;
  transition: filter 0.15s var(--ease-out), transform 0.15s var(--ease-out);
  user-select: none;
  @media (hover: hover) and (pointer: fine) {
    &:hover { filter: brightness(0.95); transform: scale(1.03); }
  }
`;

const ReplyPopup = styled.div<{ $open: boolean }>`
  max-height: ${({ $open }) => $open ? '300px' : '0'};
  opacity: ${({ $open }) => $open ? 1 : 0};
  overflow: hidden;
  transition: max-height 0.3s ease, opacity 0.2s ease, margin 0.2s ease, padding 0.2s ease;
  background: #fafafa;
  border-radius: 8px;
  margin-top: ${({ $open }) => $open ? '8px' : '0'};
  padding: ${({ $open }) => $open ? '10px 14px' : '0 14px'};
  border: ${({ $open }) => $open ? '0.5px solid #e0e0e0' : 'none'};
  font-size: 0.8125rem;
  line-height: 1.6;
  color: #555;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Times New Roman', 'Noto Serif TC', 'Noto Serif SC', serif;
`;

const EmailTimeline = styled.div`
  position: relative;
  padding-left: 20px;
  &::before {
    content: '';
    position: absolute;
    left: 7px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #e0e0e0;
  }
`;
const EmailTimelineNode = styled.div`
  position: relative;
  margin-bottom: 18px;
`;
const EmailTimelineDot = styled.div<{ $color?: string }>`
  position: absolute;
  left: -20px;
  top: 8px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color || '#bdbdbd'};
  border: 2px solid #fff;
  z-index: 1;
`;
const EmailTimelineTime = styled.div`
  font-size: 0.75rem;
  color: #999;
  margin-bottom: 4px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;
const EmailStatusPill = styled.span<{ $bg: string; $fg: string }>`
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 99px;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;
const EmailRecipient = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;
const AgentAvatar = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #d4a6c8;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;
/* segment styled components removed — plain text only */

const EditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border: 1px solid #ffe08266;
  border-radius: 99px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #e65100;
  background: #fff3e0;
  cursor: pointer;
  transition: background 0.15s var(--ease-out);
  @media (hover: hover) and (pointer: fine) {
    &:hover { background: #ffe0b2; }
  }
`;
const EditOverlay = styled.div`
  position: fixed; inset: 0; z-index: 11200;
  background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
`;
const EditModal = styled.div`
  position: relative;
  z-index: 11300;
  background: #fff; border-radius: 14px; width: 620px; max-width: 92vw;
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
  overflow: hidden;
`;
const EditModalHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px; border-bottom: 1px solid #eee;
  h3 { margin: 0; font-size: 1rem; }
`;
const EditModalBody = styled.div`
  padding: 20px 24px; display: flex; flex-direction: column; gap: 14px;
`;
const EditModalFooter = styled.div`
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 24px; border-top: 1px solid #eee;
`;
const EditInput = styled.input`
  width: 100%; box-sizing: border-box; padding: 10px 14px;
  border: 1px solid #ddd; border-radius: 8px; font-size: 0.875rem;
  outline: none; &:focus { border-color: #d689bf; }
`;
const EditTextarea = styled.textarea`
  width: 100%; box-sizing: border-box; padding: 10px 14px;
  border: 1px solid #ddd; border-radius: 8px; font-size: 0.875rem;
  outline: none; resize: vertical; font-family: inherit; line-height: 1.6;
  &:focus { border-color: #d689bf; }
`;
const EditSaveBtn = styled.button`
  padding: 8px 22px; border: none; border-radius: 8px;
  background: #d689bf; color: #fff; font-weight: 600; font-size: 0.875rem;
  cursor: pointer; &:hover { background: #c47aae; }
`;
const EditCancelBtn = styled.button`
  padding: 8px 22px; border: 1px solid #ddd; border-radius: 8px;
  background: #fff; color: #555; font-size: 0.875rem;
  cursor: pointer; &:hover { background: #f5f5f5; }
`;

/* ── renderEmailBody removed — plain text only ── */

/* ── LeadEmails component ── */

const LeadEmails: React.FC<{ companyName: string; leadId?: string }> = ({ companyName, leadId }) => {
  const { t } = useTranslation();
  const { showPrompt } = useDialog();
  const leTheme = useTheme() as any;
  const { data } = useEmailQueue({ search: companyName });
  const approve = useApproveEmail();
  const reject = useRejectEmail();
  const send = useSendEmail();

  const apiEmails = (data?.data as EmailItem[]) || [];
  const pool = apiEmails;
  const emails = pool
    .filter((e) => (e.lead_id === leadId) || (e.company_name || '') === companyName)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState<EmailItem | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  const handleStartEdit = (item: EmailItem) => {
    setEditingEmail(item);
    setEditSubject(item.subject || '');
    setEditBody((item.body || '').replace(/<[^>]*>/g, ''));
  };
  const handleSaveEdit = async () => {
    if (!editingEmail) return;
    try {
      await client.patch(`/email-queue/${editingEmail._id}`, { subject: editSubject, body: editBody });
      setEditingEmail(null);
      toast.success(t('emailQueue.editSuccess'));
      // refetch email data
      window.location.reload();
    } catch (err: any) {
      toast.error(t('emailQueue.editFailed') + (err?.message || ''));
    }
  };

  if (!emails.length) return null;

  const busy = approve.isPending || reject.isPending || send.isPending;

  const handleApproveAndSend = (d: EmailItem) => {
    if (d.status === 'approved') {
      send.mutate(d._id, {
        onSuccess: () => console.info('郵件已發送'),
        onError: () => console.error('發送失敗'),
      });
    } else {
      approve.mutate(d._id, {
        onSuccess: () => {
          console.info('已批准，正在發送…');
          send.mutate(d._id, {
            onSuccess: () => console.info('郵件已發送'),
            onError: () => console.error('發送失敗'),
          });
        },
        onError: () => console.error('批准失敗'),
      });
    }
  };

  const handleReject = async (id: string) => {
    const reason = (await showPrompt(t('leads.rejectReason'))) || undefined;
    reject.mutate({ id, reason }, {
      onSuccess: () => console.info('已拒絕'),
      onError: () => console.error('拒絕失敗'),
    });
  };

  const dotColorMap: Record<string, string> = {
    pending: '#ffc107', approved: '#66bb6a', sent: '#4caf50', rejected: '#bdbdbd', failed: '#ef5350',
  };

  return (
    <>
      <DpSectionTitle><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 3.5h14v9H1v-9zm0 0l7 4.5 7-4.5" stroke="#D689BF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>{t('leads.emailRecords')} ({emails.length})</DpSectionTitle>
      <EmailTimeline>
        {emails.map((d) => {
          const typeTag = d._type ? getEmailTypeLabel(t, leTheme)[d._type] : null;
          const emailStatusColors = getEmailStatusColor(leTheme);
          const statusColor = emailStatusColors[d.status || 'pending'] || emailStatusColors.pending;

          return (
            <EmailTimelineNode key={d._id}>
              <EmailTimelineDot $color={dotColorMap[d.status || 'pending']} />
              <EmailTimelineTime>
                {d.created_at ? new Date(d.created_at).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : ''}
              </EmailTimelineTime>
              <EmailCard $status={d.status}>
                {/* Top row: recipient left, actions right */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <EmailRecipient style={{ marginBottom: 0 }}>
                    <AgentAvatar>{(d.to_email || '?').charAt(0).toUpperCase()}</AgentAvatar>
                    To: {d.to_email || '—'}
                  </EmailRecipient>
                  {typeTag && (
                    <EmailTypeBadge
                      $bg={typeTag.bg}
                      $fg={typeTag.fg}
                      style={{ marginLeft: 8 }}
                      onClick={(e) => { e.stopPropagation(); setReplyOpenId(replyOpenId === d._id ? null : d._id); }}
                    >
                      {typeTag.text} {replyOpenId === d._id ? '▾' : '▸'}
                    </EmailTypeBadge>
                  )}
                  <div style={{ flex: 1 }} />
                  {d.status === 'pending' && (
                    <>
                      <EditBtn onClick={() => handleStartEdit(d)}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 1.5l2 2-7 7H3.5v-2l7-7zM9 3l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {t('emailQueue.edit')}
                      </EditBtn>
                      <EmailActionBtn $bg="#fce4ec" $fg="#c62828" disabled={busy} onClick={() => handleReject(d._id)}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 4L4 10M4 4l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        {t('leads.reject')}
                      </EmailActionBtn>
                      <LeadSendBtn disabled={busy} onClick={() => handleApproveAndSend(d)}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 9M14 2l-4 12-3-5-5-3 12-4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {busy ? t('leads.processing') : t('leads.approveAndSend')}
                      </LeadSendBtn>
                    </>
                  )}
                  {d.status === 'approved' && (
                    <>
                      <EditBtn onClick={() => handleStartEdit(d)}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 1.5l2 2-7 7H3.5v-2l7-7zM9 3l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {t('emailQueue.edit')}
                      </EditBtn>
                      <LeadSendBtn disabled={busy} onClick={() => send.mutate(d._id)}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 9M14 2l-4 12-3-5-5-3 12-4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {busy ? t('leads.processing') : t('leads.send')}
                      </LeadSendBtn>
                    </>
                  )}
                  {d.status === 'rejected' && (
                    <span style={{ fontSize: '0.75rem', color: leTheme.strong.mauve }}>{'✗'} {t('leads.rejected')}</span>
                  )}
                </div>

                {typeTag && (
                  <ReplyPopup $open={replyOpenId === d._id}>
                    {(d as any)._reply_body || (d as any)._reply_text || (d as any).reply_body || t('leads.noReplyContent', '暫無回覆內容')}
                  </ReplyPopup>
                )}

                <EmailCardBody>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9375rem', lineHeight: 1.7, color: '#555' }}>
                    {(d.body || '—').replace(/<[^>]*>/g, '')}
                  </div>
                </EmailCardBody>

                {/* Status pill */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <EmailStatusPill $bg={statusColor.bg} $fg={statusColor.fg}>{d.status || 'pending'}</EmailStatusPill>
                </div>
              </EmailCard>
            </EmailTimelineNode>
          );
        })}
      </EmailTimeline>
      {editingEmail && createPortal(
        <EditOverlay onClick={() => setEditingEmail(null)}>
          <EditModal onClick={(e) => e.stopPropagation()}>
            <EditModalHeader>
              <h3>{t('emailQueue.editEmail')}</h3>
              <EditCancelBtn onClick={() => setEditingEmail(null)}>✕</EditCancelBtn>
            </EditModalHeader>
            <EditModalBody>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>
                  {t('emailQueue.subject')}
                </label>
                <EditInput value={editSubject} onChange={e => setEditSubject(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>
                  {t('emailQueue.body')}
                </label>
                <EditTextarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={12} />
              </div>
            </EditModalBody>
            <EditModalFooter>
              <EditCancelBtn onClick={() => setEditingEmail(null)}>{t('common.cancel')}</EditCancelBtn>
              <EditSaveBtn onClick={handleSaveEdit}>{t('common.save')}</EditSaveBtn>
            </EditModalFooter>
          </EditModal>
        </EditOverlay>,
        document.body,
      )}
    </>
  );
};

export default LeadEmails;
